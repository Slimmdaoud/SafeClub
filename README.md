# SafeClub

## Project Idea

SafeClub is a decentralized application (dApp) that allows members of a club to collectively manage funds through proposals and voting. Members can deposit Ether, create proposals for spending, vote on them, and execute approved proposals. It's designed for community funds, DAOs, or any group needing transparent fund management on the blockchain.

## Technologies Used

- **Smart Contract**: Solidity ^0.8.20, using OpenZeppelin contracts (Ownable, ReentrancyGuard)
- **Development Framework**: Hardhat for testing and deployment
- **IDE**: Remix IDE for contract development and deployment
- **Frontend**: Next.js with React, TypeScript, Tailwind CSS for styling
- **Blockchain Interaction**: Ethers.js
- **UI Components**: Framer Motion, Lucide React

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Ganache (for local blockchain, default port 7545) or access to a testnet
- Remix IDE (online at remix.ethereum.org)

## Installation and Setup

1. **Clone the repository**:
   ```
   git clone <your-repo-url>
   cd SafeClub
   ```

2. **Install backend dependencies**:
   ```
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```
   cd ../frontend
   npm install
   cd ..
   ```

4. **Start local blockchain**:
   - Install and start Ganache on port 7545, or use Hardhat network.
   - For Hardhat: in backend directory, run `npx hardhat node`

5. **Deploy the contract**:
   - Option 1: Using Hardhat
     ```
     cd backend
     npx hardhat run scripts/deploy.js --network localhost
     ```
     This will update the contract address in `frontend/utils/contract-address.json`.
   - Option 2: Using Remix IDE
     - Open Remix IDE at https://remix.ethereum.org
     - Create a new file and paste the SafeClub.sol code
     - Compile the contract
     - Connect to your local Ganache (Environment: Injected Provider - MetaMask or Web3 Provider)
     - Deploy the contract
     - Copy the deployed contract address and update `frontend/utils/contract-address.json`

6. **Configure MetaMask**:
   - Open MetaMask and add a custom network.
   - Network Name: Localhost 7545
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Import accounts from Ganache.

7. **Run the frontend**:
   ```
   cd frontend
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Connect your MetaMask wallet.
- As owner, add members.
- Members can deposit funds, create proposals, vote, and execute proposals.

## Testing

Run tests in backend:
```
cd backend
npx hardhat test