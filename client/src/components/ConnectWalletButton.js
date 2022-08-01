const ConnectWalletButton = ({
  onPressLogout,
  onPressConnect,
  loading,
  address,
}) => {
  return (
    <div>
      {address && !loading ? (
        <button onClick={onPressLogout} id="walletButton">
          Disconnect
        </button>
      ) : loading ? (
        <button id ="walletButton" disabled>
          <div>Loading...</div>
        </button>
      ) : (
        <button onClick={onPressConnect} id="walletButton">
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectWalletButton;
