import Wallet from '../controller/wallet-controller.js'

const getWalletSchema = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    id: {
                        type: 'integer',
                        description: 'Wallet ID',
                    },
                    wallet_address: {
                        type: 'string',
                        description: 'Address in blockchain',
                    },
                    coin_type: {
                        type: 'string',
                        description: 'Type of coin',
                    },
                    balance: {
                        type: 'integer',
                        description: 'Balance of wallet',
                    },
                },
            },
            '4xx': {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                },
            },
        },
    },
}

const swapSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['target', 'from', 'to', 'amount', 'slippage', 'deadline'],
            properties: {
                target: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'string' },
                amount: { type: 'string' },
                slippage: { type: 'number' },
                deadline: { type: 'number' },
            },
        },
    },
}

const addSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['address'],
            properties: {
                address: { type: 'string' },
            },
        },
    },
}

const transferSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'to', 'token', 'amount'],
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                token: { type: 'string' },
                amount: { type: 'string' },
            },
        },
    },
}

/** Routes for Wallet API */
export default async function WalletAPI(fastify, options) {
    // Add token validation to all Wallet's roots
    fastify.addHook('onRequest', fastify.utils.CheckToken)

    // Send wallet info
    fastify.get('/', getWalletSchema, async (request, reply) => {
        return await Wallet.Get(request.userID)
    })

    fastify.get('/all', async (request, reply) => {
        return await Wallet.GetAll(request.userID)
    })

    // Add new external wallet to database
    fastify.post('/add', addSchema, async (request, reply) => {
        return await Wallet.Add(request.userID, request.body.address)
    })

    // Swap PRC20/PLS, PLS/PRC20, PRC20/PRC20
    fastify.post('/swap', swapSchema, async (request, reply) => {
        return await Wallet.Swap(request.userID, request.body)
    })

    // Transfer tokens from one wallet to another
    fastify.post('/transfer', transferSchema, async (request, reply) => {
        return await Wallet.Transfer(request.userID, request.body)
    })
}
