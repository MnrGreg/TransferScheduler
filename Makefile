######################################################################
#                                                                    #
#`  Makefile for local deployment testing with Anvil chain forking   #
#                                                                    #
######################################################################


# Sepolia Chain information
FORK_URL?=https://sepolia.drpc.org
FORK_CHAIN_ID?=11155111
MAX_PRIORITY_FEE_PER_GAS?=200000		# relay uses this value when broadcasting scheduled transfer
MAX_BASE_FEE?=10000000		# example-app uses this value when scheduling transfer

# Sepolia ERC20 contract addresses
TRANSFER_TOKEN_CONTRACT?=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238		# USDC
TRANSFER_TOKEN_HOLDER?=0xfCF7129A8a69a2BD7f2f300eFc352342D6c1638b		# large USDC holder
GAS_TOKEN_CONTRACT?=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14		# WETH

# TransferScheduler Proxy contract address
TS_CONTRACT?=0xBa551D945d9d4f14F7F6abc9abd26BD2684fA940

# Anvil wallet addresses
USER_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
USER_WALLET_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RELAYER_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
TS_OWNER=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
TS_OWNER_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Process management
.PHONY: stop
stop:
	@if [ -f .pids ]; then \
		while read pid; do \
			kill -9 $$pid 2>/dev/null || true; \
		done < .pids; \
		rm .pids; \
	fi

start-anvil-fork: stop
	anvil --chain-id ${FORK_CHAIN_ID} --block-time 10 \
	--fork-url ${FORK_URL} & echo $$! >> .pids
	sleep 10

# Transfer USDC when using forked chain
obtain-transfer-token:
	cast rpc anvil_impersonateAccount ${TRANSFER_TOKEN_HOLDER}
	cast send ${TRANSFER_TOKEN_CONTRACT} --from ${TRANSFER_TOKEN_HOLDER} "transfer(address,uint256)(bool)" ${USER_WALLET} 10000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${TRANSFER_TOKEN_HOLDER}

# Transfer WETH when using forked chain
obtain-gas-token:
	cast rpc anvil_impersonateAccount ${GAS_TOKEN_CONTRACT}
	cast send ${GAS_TOKEN_CONTRACT} --from ${GAS_TOKEN_CONTRACT} "transfer(address,uint256)(bool)" ${USER_WALLET} 100000000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${GAS_TOKEN_CONTRACT}

deploy-transferscheduler-contract:
	sed -i '' -e "s/address(0x.*),/address(${GAS_TOKEN_CONTRACT}),/" contracts/scripts/DeployTransferSchedulerProxy.s.sol
	forge clean
	sleep 5
	$(eval TS_CONTRACT = $(shell forge script contracts/scripts/DeployTransferSchedulerProxy.s.sol \
		--broadcast --rpc-url 127.0.0.1:8545 --sender ${TS_OWNER} --private-key ${TS_OWNER_KEY}  \
		--slow -vvv \
		| grep '1: address' \
		| sed -e 's/.*address //g'))
	@echo "Deployed TransferScheduler contract behind proxy address: ${TS_CONTRACT}"
	forge inspect contracts/src/TransferSchedulerV1.sol:TransferSchedulerV1 abi > ./client-sdk/transferSchedulerABI.json
	sed -i '' -e "s/TransferSchedulerContractAddress = '.*';/TransferSchedulerContractAddress = '${TS_CONTRACT}';/" client-sdk/src/constants.ts

build-client-sdk:
	cd client-sdk && npm install && npm run build

start-relay: 
	cd relay && npm install ../client-sdk/ && \
	(RPC_URL=ws://localhost:8545 PRIVATE_KEY=${RELAYER_KEY} FROM_BLOCK=latest MAX_PRIORITY_FEE_PER_GAS=${MAX_PRIORITY_FEE_PER_GAS} ts-node relay-worker.ts & echo $$! >> ../.pids)

start-webclient:
	cd frontend && npm install ../client-sdk/ && (npm run dev & echo $$! >> ../.pids)

start-example-app:
	cd client-sdk/example-app && \
	(TRANSFER_TOKEN=${TRANSFER_TOKEN_CONTRACT} MAX_BASE_FEE=${MAX_BASE_FEE} ts-node index.ts & echo $$! >> ../.pids)

test-contract:
	forge clean && forge test -vvvvv --fork-url ${FORK_URL}

all: start-anvil-fork obtain-transfer-token obtain-gas-token deploy-transferscheduler-contract build-client-sdk start-relay start-webclient start-example-app

clean:
	forge clean
