import sql from './db.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import Utils from '../utils.js'
import Wallet from './wallet-controller.js'

class UserExistError extends Error {
    constructor() {
        super()
        this.message = 'This user is already registered!'
    }
}

class UserNotFoundError extends Error {
    constructor() {
        super()
        this.message = 'This user does not exist!'
    }
}

class UserPasswordIncorrect extends Error {
    constructor() {
        super()
        this.message =
            'The email or password are incorrect. This is easily corrected by typing the correct email and password.'
    }
}

export const UserErrors = { UserExistError, UserPasswordIncorrect, UserNotFoundError }

export default class User {
    static async get(userID) {
        const rows =
            await sql`SELECT id, email, role, name, nonce FROM public.users WHERE id = ${userID} FETCH FIRST ROW ONLY`
        if (rows.count > 0) {
            return rows[0]
        }
        return new UserNotFoundError()
    }

    static async create(email, password) {
        const { exists } = await this.isUserExist(email)
        if (exists) {
            return new UserExistError()
        }
        const passwordHash = this._generateHash(password)
        const rows = await sql`
      INSERT INTO public.users(email, password)
      VALUES (${email}, ${passwordHash})
      RETURNING id`

        await Wallet.Create(rows[0].id, 'AER')
        return true
    }

    static async authentication(email, value) {
        const hashHeadPass = this._generateHash(value)
        const user = await sql`SELECT id FROM public.users WHERE email = ${email} and password = ${hashHeadPass}`
        if (user.count > 0) return user[0]['id']

        return new UserPasswordIncorrect()
    }

    /**
     * Check the user exists, if true return it info
     * @param {string} email
     * @returns {{exists: boolean, user?: UserInfo}}
     */
    static async isUserExist(email) {
        const rows = await sql`SELECT * FROM public.users WHERE email = ${email} FETCH FIRST ROW ONLY`
        return {
            exists: rows.count > 0,
            user: rows[0],
        }
    }

    /**
     * Generate a new password and send it to the user email
     * @param {number} id
     * @returns {?UserNotFoundError}
     */
    static async resetPassword(id) {
        const newPassword = Buffer.from(Utils.GenerateTrash().toString()).toString('base64')
        const rows = await sql`UPDATE users SET password = ${this._generateHash(
            newPassword,
        )} WHERE id = ${id} RETURNING email`
        if (rows.count == 0) {
            return new UserNotFoundError()
        }

        let transporter,
            testMode = false
        switch (process.env.EMAIL_SERVICE) {
            case 'TEST':
                testMode = true
                const testAccount = await nodemailer.createTestAccount()
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                })
                break
            case 'gmail':
            default:
                transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD,
                    },
                })
                break
        }
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: rows[0].email,
            subject: 'Password reset',
            text: `Your password has been reset. Use new one: ${newPassword}`,
        })
        console.log('Message sent: %s', info.messageId)

        if (testMode) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
        }
    }

    static _generateHash(value) {
        return crypto.createHmac('sha256', process.env.SECRET_KEY).update(value).digest('hex')
    }

    static async setNonce(userID, nonce) {
        await sql`
      UPDATE users
      SET nonce = ${nonce}
      WHERE id = ${userID}`
    }

    static async createMeta(address, nonce) {
        const rows = await sql`
      INSERT INTO public.users(nonce)
      VALUES (${nonce})
      RETURNING id`

        await Wallet.Add(rows[0].id, address)
        return true
    }
}

/**
 * @typedef {object} UserInfo
 * @property {number} id
 * @property {string} email
 * @property {string} password
 * @property {string} role
 * @property {string} name
 */
