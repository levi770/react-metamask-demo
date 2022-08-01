# Fastify/ReactJS example of Metamask integration

This is a demo of a ReactJS app that uses the Metamask browser extension and Fastify based REST API to authenticate users by signing a message with nonce received from server and their private key, than server recovers user's address from provided signature and return JWT token to React App. After JWT token is received, React App can interact with servers private endpoints and generate transactions.

Server setup

1. clone this repository
2. cd into ./server
3. run `npm i`
4. fill .env-example with your data and rename to .env
5. run `npm run setup_db`
6. run `npm run live`

To launch client:

1. cd into ./client
2. type `npm i`
3. type `npm run start`

demo project will be launched on [localhost:3000](https://localhost:3000)
