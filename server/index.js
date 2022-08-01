import Fastify from 'fastify'
import Cors from '@fastify/cors'
const fastify = new Fastify({ logger: true })

// Make Utils available for all routes by using fastify.utils
import Utils from './src/utils.js'
fastify.decorate('utils', Utils)

fastify.register(Cors, {
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
})

// Register Routes
import authAPI from './src/routes/auth-api.js'
import walletAPI from './src/routes/wallet-api.js'

fastify.register(authAPI, { prefix: '/auth' })
fastify.register(walletAPI, { prefix: '/wallet' })

// Run the server!
const start = async () => {
    try {
        await fastify.listen(3000)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
