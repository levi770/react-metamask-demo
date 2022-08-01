import Web3 from 'web3'
import U from 'web3-utils'
import { readFile } from 'fs/promises'

const provider = new Web3.providers.HttpProvider(process.env['PULSECHAIN_HOST'])
const w3 = new Web3(provider)

const ROUTER_ADDRESS = process.env['ROUTER_ADDRESS']
const ADMIN_ADDRESS = process.env['ADMIN_ADDRESS']
const ADMIN_PRIV_KEY = process.env['ADMIN_PRIV_KEY']

const ERC20_JSON = JSON.parse(await readFile(new URL('./IERC20.json', import.meta.url)))
const ROUTER_JSON = JSON.parse(await readFile(new URL('./IUniswapV2Router02.json', import.meta.url)))

const ROUTER_CONTRACT = new w3.eth.Contract(ROUTER_JSON.abi, ROUTER_ADDRESS)

export default class Blockchain {
    constructor() {}

    static async createAccount() {
        const account = w3.eth.accounts.create()
        return {
            address: account['address'],
            keystore: account.encrypt(process.env.SECRET_KEY),
        }
    }

    static async getBalance(userWalletAddress) {
        const user_balance2 = await AER_CONTRACT.methods.balanceOf(userWalletAddress).call()
        return U.fromWei(user_balance2, 'ether')
    }

    static async send(from, to, key, data) {
        const tx = {
            nonce: await w3.eth.getTransactionCount(from),
            from: from,
            to: to,
            chainId: await w3.eth.getChainId(),
            gas: await data.estimateGas({ from: from, value: 0 }),
            maxPriorityFeePerGas: await w3.eth.getGasPrice(),
            data: data.encodeABI(),
            value: 0,
        }

        const commission = +tx.gas * +tx.maxPriorityFeePerGas
        const balance = await w3.eth.getBalance(from)
        if (+balance < commission) {
            throw new Error('Not enough ETH balance')
        }

        const signedTx = await w3.eth.accounts.signTransaction(tx, key)
        return await w3.eth.sendSignedTransaction(signedTx.rawTransaction)
    }

    static async swap(wallet, swap) {
        try {
            const targetAddress = wallet[0].wallet_address
            const plsAddress = await ROUTER_CONTRACT.methods.WPLS().call()

            const tradeCase =
                swap.from.toLowerCase() === plsAddress.toLowerCase()
                    ? 'EthToErc20'
                    : swap.to.toLowerCase() === plsAddress.toLowerCase()
                    ? 'Erc20ToEth'
                    : 'Erc20ToErc20'

            const route =
                swap.from.toLowerCase() !== plsAddress.toLowerCase() &&
                swap.to.toLowerCase() !== plsAddress.toLowerCase()
                    ? [swap.from, plsAddress, swap.to]
                    : [swap.from, swap.to]

            const tradeAmountIn = U.toWei(swap.amount, 'ether')
            const amounts = await ROUTER_CONTRACT.methods.getAmountsOut(tradeAmountIn, route).call()
            const amountOut = +amounts[amounts.length - 1]
            const minAmountOut = swap.slippage === -1 ? 0 : (amountOut - amountOut * (swap.slippage / 100)).toFixed(0)
            const deadline = Math.round(Date.now() / 1000) + 60 * swap.deadline

            let data = null
            let txData = {}

            const allowance = await Blockchain.getAllowanceAndBalance(
                tradeAmountIn,
                swap.from,
                ADMIN_ADDRESS,
                ROUTER_ADDRESS,
            )

            switch (tradeCase) {
                case 'EthToErc20':
                    if (!allowance.enoughEth) throw new Error('Not enough balance')
                    data = ROUTER_CONTRACT.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        minAmountOut,
                        route,
                        targetAddress,
                        deadline,
                    )
                    txData.value = tradeAmountIn
                    txData.to = ROUTER_ADDRESS

                    break

                case 'Erc20ToEth':
                    if (!allowance.enoughErc20) throw new Error('Not enough balance')
                    if (!allowance.enoughAllowance) {
                        data = await this.generateApproveData(swap.from, ROUTER_ADDRESS)
                        txData.value = 0
                        txData.to = swap.from
                    } else {
                        data = ROUTER_CONTRACT.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
                            tradeAmountIn,
                            minAmountOut,
                            route,
                            targetAddress,
                            deadline,
                        )
                        txData.value = 0
                        txData.to = ROUTER_ADDRESS
                    }

                    break

                case 'Erc20ToErc20':
                    if (!allowance.enoughErc20) throw new Error('Not enough balance')
                    if (!allowance.enoughAllowance) {
                        data = await this.generateApproveData(swap.from, ROUTER_ADDRESS)
                        txData.value = 0
                        txData.to = swap.from
                    } else {
                        txData.data = ROUTER_CONTRACT.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                            tradeAmountIn,
                            minAmountOut,
                            route,
                            targetAddress,
                            deadline,
                        )
                        txData.value = 0
                        txData.to = ROUTER_ADDRESS
                    }

                    break
            }

            ;(txData.nonce = await w3.eth.getTransactionCount(ADMIN_ADDRESS)),
                (txData.maxPriorityFeePerGas = await w3.eth.getGasPrice())
            txData.gas = await data.estimateGas({ from: ADMIN_ADDRESS, value: txData.value })
            txData.data = data.encodeABI()
            txData.from = ADMIN_ADDRESS

            const comission = U.fromWei((+txData.gas * +txData.maxPriorityFeePerGas).toFixed(0), 'ether')

            if (allowance.balanceEth < txData.value + +txData.gas * +txData.maxPriorityFeePerGas) {
                throw new Error('Not enought balance: value + comission')
            }

            const signed = await w3.eth.accounts.signTransaction(txData, ADMIN_PRIV_KEY)
            const tx = await w3.eth.sendSignedTransaction(signed.rawTransaction)

            return {
                targetAddress,
                route,
                comission,
                txData,
                tx,
            }
        } catch (error) {
            throw new Error(error)
        }
    }

    static async getAllowanceAndBalance(amount, from, address, router) {
        let allowance, balanceEth, balanceErc20

        try {
            const contract = new w3.eth.Contract(ERC20_JSON.abi, from)
            allowance = await contract.methods.allowance(address, router).call()
            balanceEth = await w3.eth.getBalance(address)
            balanceErc20 = await contract.methods.balanceOf(address).call()
        } catch (error) {
            throw new Error(error.message)
        }

        return {
            enoughAllowance: !U.toBN(amount).gte(U.toBN(allowance)),
            enoughEth: !U.toBN(amount).gte(U.toBN(balanceEth)),
            enoughErc20: !U.toBN(amount).gte(U.toBN(balanceErc20)),
            balanceErc20,
            balanceEth,
        }
    }

    static async generateApproveData(from, router) {
        const contract = new w3.eth.Contract(ERC20_JSON.abi, from)
        return contract.methods.approve(router, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    }

    static async transferExternal(transfer) {
        try {
            let tx, transferAmount, gas, maxFeePerGas, nonce, value

            if (transfer.token != 'pls') {
                const erc20Contract = new w3.eth.Contract(ERC20_JSON.abi, transfer.token)
                const balance = await erc20Contract.methods.balanceOf(transfer.from).call()
                if (+balance < +transferAmount) {
                    throw new Error('Not enought token balance')
                }
                transferAmount = U.toWei(transfer.amount, 'ether')
                const data = erc20Contract.methods.transfer(transfer.to, transferAmount)
                gas = await data.estimateGas({ from: transfer.from, value: 0 })
                maxFeePerGas = await w3.eth.getGasPrice()
                nonce = await w3.eth.getTransactionCount(transfer.from)
                value = 0

                tx = {
                    value: U.toHex('0'),
                    from: transfer.from,
                    to: transfer.token,
                    nonce: U.toHex(nonce),
                    gas: U.toHex(gas),
                    maxFeePerGas: U.toHex(maxFeePerGas),
                    data: data.encodeABI(),
                }
            } else {
                transferAmount = U.toWei(transfer.amount, 'ether')
                gas = await w3.eth.estimateGas({
                    from: transfer.from,
                    to: transfer.to,
                    value: transferAmount,
                })
                maxFeePerGas = await w3.eth.getGasPrice()
                nonce = await w3.eth.getTransactionCount(transfer.from)
                value = +transferAmount

                tx = {
                    from: transfer.from,
                    to: transfer.to,
                    nonce: U.toHex(nonce),
                    gas: U.toHex(gas),
                    maxFeePerGas: U.toHex(maxFeePerGas),
                    value: U.toHex(transferAmount),
                }
            }

            const balance = await w3.eth.getBalance(transfer.from)
            const comission = U.fromWei((+gas * +maxFeePerGas).toFixed(0), 'ether')

            if (+balance < value + +gas * +maxFeePerGas) {
                throw new Error('Not enought balance: value + comission')
            }

            return {
                tx,
                comission,
            }
        } catch (error) {
            throw new Error(error)
        }
    }

    static async verifyMsg(message, signature, address) {
        const recovered = w3.eth.accounts.recover(message, signature)
        if (recovered != address) return false
        return true
    }
}
