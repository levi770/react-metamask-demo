import Web3 from 'web3'
import { useState } from 'react'
import axios from 'axios'

import './App.css'

import ConnectWalletButton from './components/ConnectWalletButton'
import SendTxRequestForm from './components/SendTxRequestForm'
import mobileCheck from './helpers/mobileCheck'
import getLinker from './helpers/deepLink'

const baseUrl = 'http://localhost:3000'

const App = () => {
    const [loading, setLoading] = useState(false)
    const [address, setAddress] = useState('')
    const [token, setToken] = useState('')
    const [profile, setProfile] = useState({})
    const [inputTx, setInputTx] = useState({ from: '', to: '', amount: '', token: '' })
    const [status, setStatus] = useState('')

    const onPressConnect = async () => {
        setLoading(true)

        try {
            const yourWebUrl = 'yoursite.com'
            const deepLink = `https://metamask.app.link/dapp/${yourWebUrl}`
            const downloadMetamaskUrl = 'https://metamask.io/download.html'

            if (window?.ethereum?.isMetaMask) {
                // Desktop browser
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                })

                const account = Web3.utils.toChecksumAddress(accounts[0])

                const chainId = await window.ethereum.request({ method: 'eth_chainId' })

                if (chainId !== '0x3ad') {
                    alert('Please connect to Pulsechain testnet with chainId 941')
                } else {
                    await handleLogin(account)
                }
            } else if (mobileCheck()) {
                // Mobile browser
                const linker = getLinker(downloadMetamaskUrl)
                linker.openURL(deepLink)
            } else {
                window.open(downloadMetamaskUrl)
            }
        } catch (error) {
            console.log(error)
            setAddress('')
        }

        setLoading(false)
    }

    const handleLogin = async (address) => {
        const response = await axios.get(`${baseUrl}/auth/${address}/nonce`)
        const nonce = response?.data?.nonce
        if (!nonce) {
            throw new Error('Invalid message to sign')
        }

        const w3 = new Web3(Web3.givenProvider)
        const signature = await w3.eth.personal.sign(nonce, address)
        const jwtResponse = await axios.post(`${baseUrl}/auth/${address}/login`, { signature })
        const token = jwtResponse?.data?.token
        if (!token) {
            throw new Error('Invalid JWT')
        }

        setToken(jwtResponse?.data?.token)
        await getProfile(token)
        setAddress(address)
    }

    const getProfile = async (token) => {
        const baseUrl = 'http://localhost:3000'
        const response = await axios.get(`${baseUrl}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
        setProfile(response?.data)
    }

    const onPressLogout = () => {
        setToken('')
        setAddress('')
        setProfile({})
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        const tx = inputTx
        tx[name] = value
        setInputTx(tx)
    }

    const requestTx = async (tx) => {
        if (tx.amount.trim() === '' || tx.from.trim() === '' || tx.to.trim() === '' || tx.token.trim() === '') {
            return {
                success: false,
                status: (
                    <p id="status" style={{ color: 'red' }}>
                        Please make sure all fields are completed before sending request.
                    </p>
                ),
            }
        }

        try {
            const txResponse = await axios.post(`${baseUrl}/wallet/transfer`, tx, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txResponse?.data?.tx],
            })

            const url = `https://scan.v2b.testnet.pulsechain.com/tx/${txHash}`
            const str = 'Check out your transaction on Pulsechain explorer: '
            return {
                success: true,
                status: (
                    <p id="status" style={{ color: 'green' }}>
                        {str}
                        <a href={url} target="_blank" rel="noreferrer">
                            {url}
                        </a>
                    </p>
                ),
            }
        } catch (error) {
            const str = '😥 Something went wrong: ' + error.message
            return {
                success: false,
                status: (
                    <p id="status" style={{ color: 'red' }}>
                        {str}
                    </p>
                ),
            }
        }
    }

    const onTxPressed = async () => {
        const { success, status } = await requestTx(inputTx)
        setStatus(status)
        if (success) {
            setInputTx({})
        }
    }

    if (address) {
        return (
            <div className="App">
                <ConnectWalletButton
                    onPressConnect={onPressConnect}
                    onPressLogout={onPressLogout}
                    loading={loading}
                    address={address}
                />

                <SendTxRequestForm
                    handleInputChange={handleInputChange}
                    onTxPressed={onTxPressed}
                    address={address}
                    status={status}
                    profile={profile}
                />
            </div>
        )
    }

    return (
        <div className="App">
            <ConnectWalletButton
                onPressConnect={onPressConnect}
                onPressLogout={onPressLogout}
                loading={loading}
                address={address}
            />

            <br></br>
            <h1 id="title">React + Metamask REST API login demo</h1>
            <p>
                This is a demo of a ReactJS app that uses the Metamask browser extension and REST API to authenticate
                users by signing a message with nonce received from server and their private key, than server recovers
                user's address from provided signature and return JWT token to React App. After JWT token is received,
                React App can interact with servers private endpoints and generate transactions.
            </p>
        </div>
    )
}

export default App
