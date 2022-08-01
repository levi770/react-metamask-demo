// Module with helper functions
import crypto from 'crypto'

const Utils = {
    GenerateTrash() {
        return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    },

    /**
     * Create and encode JWT
     * @param {object} payload
     */
    CreateJWT(payload) {
        let head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'jwt' })).toString('base64')
        let body = Buffer.from(JSON.stringify(payload)).toString('base64')
        let signature = crypto.createHmac('SHA256', process.env.SECRET_KEY).update(`${head}.${body}`).digest('base64')

        return `${head}.${body}.${signature}`
    },

    /**
     * Decode and validate JWT token
     * @param {string} token
     * @returns {{isValid: boolean, payload?: object}}
     */
    ValidateJWT(token) {
        let tokenParts = token.split('.')
        let signature = crypto
            .createHmac('SHA256', process.env.SECRET_KEY)
            .update(`${tokenParts[0]}.${tokenParts[1]}`)
            .digest('base64')

        if (signature === tokenParts[2])
            return {
                isValid: true,
                payload: JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8')),
            }

        return { isValid: false }
    },

    /**
     * Function for fastify onRequest hook. Decode and validate the JWT token.
     * If the token is valid, place decoded data to request.token
     */
    CheckToken(request, reply, done) {
        const authHeader = request.headers['authorization']
        if (!authHeader) {
            reply.code(401)
            reply.send(Utils.ReplyError('Where is token?'))
        }

        const token = authHeader.split(' ')[1]
        const decodedToken = Utils.ValidateJWT(token)
        if (!decodedToken.isValid) {
            reply.code(401)
            reply.send(Utils.ReplyError('Bad token'))
        }

        request.userID = decodedToken.payload['userID']
        done()
    },

    /** Macro for error reply */
    ReplyError: (message) => ({ message }),

    // Add { schema: ... } to every schema object annoys me. That's why I wrote this function
    /**
     * Wrap object properties in `{ schema: *prop value* }`.
     * Useful when you need to wrap many schemas at once
     * @param {object} schemas - object with schemas
     * @returns {object} input {@link schemas} with wrapped properties
     */
    SchemasWrapper(schemas) {
        Object.keys(schemas).forEach((object_key) => {
            schemas[object_key] = { schema: schemas[object_key] }
        })
        return schemas
    },
}

export default Utils
