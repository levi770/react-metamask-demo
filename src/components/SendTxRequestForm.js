const SendTxRequestForm = ({
  handleInputChange,
  onTxPressed,
  address,
  status,
  profile
}) => {
  return (
    <div>
      <div id="profile"> user_id: {profile.id}</div>
      <br></br>
      <h1 id="title">Transfer form</h1>
      <p>
        <strong>"From address"</strong> - your Metamask address. <br></br>
        <strong>"To address"</strong> - transfer target address. <br></br>
        <strong>"Currency"</strong> - if you want to send PLS type "pls", or type PRC20 token contract address. <br></br>
        <strong>"Amount"</strong> - type any amount of currency you want to send. <br></br>
        <br></br>
        then press <strong>"Transfer"</strong> to send transaction.
      </p>

      <form>
        <h2>From address: </h2>
        <input
          type="text"
          name="from"
          placeholder={address ? address : "Enter your address"}
          onChange={(event) => handleInputChange(event)}
        />
        <h2>To address: </h2>
        <input
          type="text"
          name="to"
          placeholder="0x..."
          onChange={(event) => handleInputChange(event)}
        />
        <h2>Currency: </h2>
        <input
          type="text"
          name="token"
          placeholder="'pls' or 0x..."
          onChange={(event) => handleInputChange(event)}
        />
        <h2>Amount: </h2>
        <input
          type="text"
          name="amount"
          placeholder="0.01"
          onChange={(event) => handleInputChange(event)}
        />
      </form>

      <button id="txButton" onClick={onTxPressed}>
        Transfer
      </button>

      {status}
      
    </div>
  );
};

export default SendTxRequestForm;
