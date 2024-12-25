
# Base ERC20 contract addresses
USDC_CONTRACT?=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
USDC_HOLDER?=0x0B0A5886664376F59C351ba3f598C8A8B4D0A6f3
WETH_CONTRACT?=0x4200000000000000000000000000000000000006

# Anvil wallet addresses
ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ADDRESSKEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
SIGNERKEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
TS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
TSKEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Process management
PIDFILE := .pids

.PHONY: stop
stop:
	@if [ -f $(PIDFILE) ]; then \
		while read pid; do \
			kill -9 $$pid 2>/dev/null || true; \
		done < $(PIDFILE); \
		rm $(PIDFILE); \
	fi

start-anvil-base-fork: stop
	anvil --chain-id 31337 --block-time 30 --gas-price 1000000000  \
	--fork-url https://mainnet.base.org & echo $$! >> $(PIDFILE)
	sleep 10

# Transfer USDC when using forked chain
transfer-usdc:
	cast rpc anvil_impersonateAccount ${USDC_HOLDER}
	cast send ${USDC_CONTRACT} --from ${USDC_HOLDER} "transfer(address,uint256)(bool)" ${ADDRESS} 1000000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${USDC_HOLDER}

# Transfer WETH when using forked chain
transfer-weth:
	cast rpc anvil_impersonateAccount ${WETH_CONTRACT}
	cast send ${WETH_CONTRACT} --from ${WETH_CONTRACT} "transfer(address,uint256)(bool)" ${ADDRESS} 100000000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${WETH_CONTRACT}

deploy-transferscheduler-contract:
	sed -i '' -e "s/address(0x.*),/address(${WETH_CONTRACT}),/" contracts/scripts/DeployTransferSchedulerProxy.s.sol
	forge clean
	sleep 5
	$(eval TSCONTRACT = $(shell forge script contracts/scripts/DeployTransferSchedulerProxy.s.sol \
		--broadcast --rpc-url 127.0.0.1:8545 --sender ${TS} --private-key ${TSKEY}  \
		--slow -vvv \
		| grep '1: address' \
		| sed -e 's/.*address //g'))
	@echo "Deployed TransferScheduler contract behind proxy address: ${TSCONTRACT}"
	forge inspect contracts/src/TransferSchedulerV1.sol:TransferSchedulerV1 abi > ./client-sdk/transferSchedulerABI.json
	sed -i '' -e "s/TransferSchedulerContractAddress = '.*';/TransferSchedulerContractAddress = '${TSCONTRACT}';/" client-sdk/src/constants.ts
	sed -i '' -e "s/TransferSchedulerContractAddress = '.*';/TransferSchedulerContractAddress = '${TSCONTRACT}';/" frontend/src/constants.ts

build-client-sdk:
	cd client-sdk && npm run build

start-relay: 
	@echo "Starting relay"
	cd relay && (RPC_URL=ws://localhost:8545 ts-node relay-worker.ts & echo $$! >> ../$(PIDFILE))

start-webclient:
	cd frontend && (npm run dev & echo $$! >> ../$(PIDFILE))

start-example-app:
	cd client-sdk/example-app && (ts-node index.ts & echo $$! >> ../$(PIDFILE))

test-contract:
	forge clean && forge test -vvvvv --fork-url https://mainnet.base.org

all: start-anvil-base-fork transfer-usdc transfer-weth deploy-transferscheduler-contract build-client-sdk start-relay start-webclient start-example-app

clean:
	forge clean
