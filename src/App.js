import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import kp from './keypair.json'
import './App.css';

//Reference to the Solana runtime
const { SystemProgram, Keypair } = web3;

//Creating keypair for the account that will hold GIF data
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

//Getting program is from the IDL file
const programID = new PublicKey(idl.metadata.address);

//Setting our network to devnet
const network = clusterApiUrl('devnet');

//How we want to acknowledge when a transaction is "done"
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TEST_GIFS = [
  'https://media.giphy.com/media/26BRzozg4TCBXv6QU/giphy.gif',
  'https://media.giphy.com/media/qLHzYjlA2FW8g/giphy.gif',
  'https://media.giphy.com/media/Uc63DLTrbmqvS/giphy.gif',
  'https://media.giphy.com/media/13eD01wPr7iiTC/giphy.gif'
]
const TWITTER_HANDLE = 'dxlantxch';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  //State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  //Logic for checking if the Phantom Wallet is connected or not
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom Wallet found!");
          //The solana object gives a function that allows us to connect with the users wallet
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with the Public Key:',
            response.publicKey.toString()
          );
          //Setting the user's public key to be used in state later
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet!");
      }
    }  catch (error) {
       console.error(error);
    }
  };

  //Defining this method so that our code doesn't break
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  // const sendGif = async () => {
  //   if (inputValue.length > 0) {
  //     console.log('Gif link:', inputValue);
  //     setGifList([...gifList, inputValue]);
  //     setInputValue('');
  //   } else {
  //     console.log('Empty input. Please try again!')
  //   }
  // }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    setInputValue('');
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('GIF successfully sent to program', inputValue)

      await getGifList();
    } catch (error) {
      console.log('Error sending GIF:', error)
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/address:", baseAccount.publicKey.toString())
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account", error)
    }
  }

  //The following UI will be rendered when the user hasn't connected their wallet to the app yet
  const renderNotConnectedContainer = () => {
    return (
      <button 
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
       Connect to Wallet
      </button>
    )
  };

  const renderConnectedContainer = () => {
    //Renders if prorgam account hasn't been initialized yet
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do a One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } else {
      return (
        <div className="connected-container">
          {/* Form to submit the gifs */}
          <form
             onSubmit={(event) => {
               event.preventDefault();
               sendGif();
             }}
          >
            <input type="text" placeholder="Enter the link of your favorite HP GIF!" value={inputValue} onChange={onInputChange} />
            <button type="submit" className="cta-button submit-gif-button">Submit</button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
                <p className="posted-by-text">Posted by: {item.userAddress.toString()}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  const renderImage = () => {
    return (
      <div class="landing-image-container">
        <img className="landing-image" src="https://media.giphy.com/media/d6Ni9aqSatPfq/giphy.gif" />
      </div>
    )
  }

  //When our component mounts, check if Phantom Wallet is connected
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList", error);
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      //Call Solana program here
      getGifList()
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        {!walletAddress && renderImage()}
        <div className="header-container">
          <p className="header">🪄 HP Crypto GIFS</p>
          <p className="sub-text">
            Post and view GIFS of your favorite Harry Potter characters on the Solana blockchain ✨
          </p>
          {/* Only shows this if there is no wallet address in state */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* Only renders this if the user has connected their wallet */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
