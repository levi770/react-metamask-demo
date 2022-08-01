import sql from './db.js'
import Blockchain from '../controller/blockchain-controller.js'

/**
 * Perform control over wallets
 */
export default class Wallet {
    /** Update wallet info */
    static async Update(userID, data) {
        await sql`
      UPDATE wallet
      SET ${sql(data, 'wallet_address', 'coin_type')}
      WHERE user_id = ${userID}`
    }

    /**
     * Return wallet info
     * @returns {Promise<WalletData>}
     */
    static async Get(userID) {
        const walletInfo = await sql`
      SELECT *
      FROM wallet
      WHERE user_id = ${userID}`
        return { ...walletInfo[0], balance: await Blockchain.getBalance(walletInfo[0].wallet_address) }
    }

    static async GetAll(userID) {
        return await sql`
      SELECT *
      FROM wallet
      WHERE user_id = ${userID}`
    }

    static async GetOne(userID, address) {
        return await sql`
      SELECT *
      FROM wallet
      WHERE user_id = ${userID} 
      AND wallet_address = ${address}`
    }

    static async GetByAddress(address) {
        return await sql`
      SELECT *
      FROM wallet
      WHERE wallet_address = ${address}`
    }

    static async GetBalance(userID) {
        const user = await this.Get(userID)
        return await Blockchain.getBalance(user.wallet_address)
    }

    /** Create new wallet */
    static async Create(userID, coinType) {
        const account = await Blockchain.createAccount()
        await sql`
      INSERT INTO public.wallet(user_id, wallet_address, coin_type, keystore)
      VALUES (${userID}, ${account.address}, ${coinType}, ${account.keystore})`
    }

    /** Create new wallet */
    static async Add(userID, address) {
        return await sql`
      INSERT INTO public.wallet(user_id, wallet_address, coin_type, keystore, type)
      VALUES (${userID}, ${address}, ${'AER'}, ${null}, 'external')`
    }

    static async Swap(userID, swap) {
        const wallet = await this.GetOne(userID, swap.target)
        if (wallet.length == 0) {
            throw new Error('Wallet not found')
        }
        return await Blockchain.swap(wallet, swap)
    }

    static async Transfer(userID, transfer) {
        const wallet = await this.GetOne(userID, transfer.from)
        if (wallet.length == 0) {
            throw new Error('Wallet not found')
        }
        return await Blockchain.transferExternal(transfer)
    }
}

/**
 * @typedef {Object} WalletData
 * @property {number} id Wallet ID
 * @property {string} wallet_address Address in blockchain
 * @property {string} coin_type Type of coin
 * @property {number} balance Balance of wallet
 * @property {number} keystore Balance of wallet
 */
