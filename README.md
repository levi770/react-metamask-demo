# Example of ReactJS + Metamask integration

This is a demo of a ReactJS app that uses the Metamask browser extension and REST API to authenticate users by signing a message with nonce received from server and their private key, than server recovers user's address from provided signature and return JWT token to React App. After JWT token is received, React App can interact with servers private endpoints and generate transactions.

To launch this example:
1. clone this repository
2. type `npm i`
3. type `npm run start`

demo project will be launched on [localhost:3000](https://localhost:3000)