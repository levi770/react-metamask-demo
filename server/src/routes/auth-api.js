import User, { UserErrors } from '../controller/user-controller.js'
import Wallet from '../controller/wallet-controller.js'
import Blockchain from '../controller/blockchain-controller.js'

async function publicAPI(fastify, options) {
    // Transform the email to lower case
    fastify.addHook('preHandler', (request, reply, done) => {
        request.body['email'].toLowerCase()
        done()
    })

    const loginSchema = {
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['email', 'password'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        pattern: '^\\S+@\\S+\\.\\S+$',
                    },
                    password: { type: 'string', minLength: 8 },
                },
            },
        },
    }

    fastify.post('/register', loginSchema, async (request, reply) => {
        const email = request.body['email']
        const password = request.body['password']
        const status = await User.create(email, password)
        switch (status.constructor) {
            case UserErrors.UserExistError: {
                reply.code(409)
                reply.send(status)
                break
            }
            default: {
                reply.code(201)
                reply.send({ message: 'Done' })
            }
        }
    })

    fastify.post('/login', loginSchema, async (request, reply) => {
        const email = request.body['email']
        const password = request.body['password']
        const userID = await User.authentication(email, password)
        switch (userID.constructor) {
            case UserErrors.UserPasswordIncorrect: {
                reply.code(400)
                reply.send(userID)
                break
            }
            default: {
                reply.code(200)
                reply.send({ token: fastify.utils.CreateJWT({ userID: userID }) })
            }
        }
    })

    // Reset password route
    fastify.post(
        '/reset',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            pattern: '^\\S+@\\S+\\.\\S+$',
                        },
                    },
                },
                response: {
                    200: {
                        type: 'string',
                    },
                    404: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const email = request.body['email']
            const { exists, user } = await User.isUserExist(email)
            if (!exists) {
                reply.code(404)
                return { message: 'Email not found' }
            }

            await User.resetPassword(user.id)
            return 'Reset is successful. Check your mail for new password'
        },
    )
}

async function privateAPI(fastify, options) {
    fastify.addHook('onRequest', fastify.utils.CheckToken)

    fastify.get('/profile', async (request, reply) => {
        const profile = await User.get(request.userID)
        switch (profile.constructor) {
            case UserErrors.UserNotFoundError: {
                reply.code(404)
                reply.send(profile)
                break
            }
            default: {
                reply.code(200)
                reply.send(profile)
            }
        }
    })

    fastify.get('/artist/:id', async (request, reply) => {
        const profile = await User.getArtist(request.params.id)
        switch (profile.constructor) {
            case UserErrors.UserNotFoundError: {
                reply.code(404)
                reply.send(profile)
                break
            }
            default: {
                reply.code(200)
                reply.send(profile)
            }
        }
    })
}

async function metamaskAPI(fastify, options) {
    fastify.get('/:wallet_address/nonce', async (request, reply) => {
        const wallet = await Wallet.GetByAddress(request.params.wallet_address)
        const nonce = Math.random().toString(36).slice(-10)
        if (wallet.length === 0) {
            await User.createMeta(request.params.wallet_address, nonce)
        } else {
            await User.setNonce(wallet[0].user_id, nonce)
        }
        return { nonce }
    })

    fastify.post('/:wallet_address/login', async (request, reply) => {
        const wallet = await Wallet.GetByAddress(request.params.wallet_address)
        if (wallet.length === 0) {
            throw new Error('Wallet not found')
        }

        const user = await User.get(wallet[0].user_id)
        const verified = await Blockchain.verifyMsg(user.nonce, request.body.signature, request.params.wallet_address)

        if (verified) {
            reply.code(200)
            reply.send({ token: fastify.utils.CreateJWT({ userID: user.id }) })
        }

        reply.code(400)
        reply.send({ verified })
    })
}

/** Routes for Auth API */
export default async function AuthAPI(fastify, options) {
    fastify.register(publicAPI)
    fastify.register(privateAPI)
    fastify.register(metamaskAPI)
}
