import sql from './controller/db.js'

const setup = async () => {
    console.log('Create coin enum')
    try {
        await sql`CREATE TYPE coin AS ENUM ('BTC', 'ETH', 'DOGE', 'other')`
    } catch (e) {
        console.log(e)
    }

    console.log('Create user role enum')
    try {
        await sql`CREATE TYPE role AS ENUM ('user', 'author')`
    } catch (e) {
        console.log(e)
    }

    console.log('Create wallet type enum')
    try {
        await sql`CREATE TYPE wtype AS ENUM ('internal', 'external')`
    } catch (e) {
        console.log(e)
    }

    console.log('Create users table')
    await sql`
    CREATE TABLE IF NOT EXISTS users(
      id        SERIAL      NOT NULL PRIMARY KEY,
      name      VARCHAR(64),
      email     VARCHAR(64),
      password  CHAR(64)   ,
      role      ROLE        NOT NULL DEFAULT 'user',
      nonce     VARCHAR(64)    
    )`

    console.log('Create wallet table')
    await sql`
    CREATE TABLE IF NOT EXISTS wallet(
      id              SERIAL      NOT NULL PRIMARY KEY,
      user_id         INT         NOT NULL REFERENCES users(id),
      wallet_address  VARCHAR(64),
      coin_type       coin,
      keystore        JSON       ,
      type            WTYPE  NOT NULL DEFAULT 'internal'
    )`

    console.log('Create oauth table')
    await sql`
    CREATE TABLE IF NOT EXISTS oauth(
      id          SERIAL      NOT NULL PRIMARY KEY,
      user_id     INT         NOT NULL REFERENCES users(id),
      oauth_token CHAR(5125)  NOT NULL,
      oauth_type  INT         NOT NULL
    )`

    process.exit()
}
setup()
