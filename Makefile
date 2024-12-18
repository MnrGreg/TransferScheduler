#
# Shows help message.
#
.PHONY: help
help:
	@echo 'To release a ve, run the following commands in order on the branch where you make a release.'
	@echo '  $$ make forked-base'
	@echo '  $$ make all'


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


#--block-time 60
start-anvil-base-fork: stop
	anvil --chain-id 31337 --block-time 30 --fork-url https://mainnet.base.org & echo $$! >> $(PIDFILE)
	sleep 10

start-anvil-local: stop
	anvil --base-fee 7 & echo $$! >> $(PIDFILE)
	sleep 10

# Transfer USDC when using forked chain
transfer-usdc:
	cast rpc anvil_impersonateAccount ${USDC_HOLDER}
	cast send ${USDC_CONTRACT} --from ${USDC_HOLDER} "transfer(address,uint256)(bool)" ${ADDRESS} 100000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${USDC_HOLDER}

# Transfer WETH when using forked chain
transfer-weth:
	cast rpc anvil_impersonateAccount ${WETH_CONTRACT}
	cast send ${WETH_CONTRACT} --from ${WETH_CONTRACT} "transfer(address,uint256)(bool)" ${ADDRESS} 100000000000 --unlocked
	cast rpc anvil_stopImpersonatingAccount ${WETH_CONTRACT}

# Deploy USDC when using local anvil
deploy-mock-usdc:
	@echo "Deploying USDC ERC20 contract for local anvil"
	$(eval USDC_CONTRACT := $(shell forge create --rpc-url 127.0.0.1:8545 --private-key ${SIGNERKEY} \
		contracts/lib/permit2/test/mocks/MockERC20.sol:MockERC20 \
		--constructor-args "USDCERC20" "USDC" 18 1000000000000000000000 \
		| grep 'Deployed to:' \
		| sed -e 's/.*Deployed to: //g'))
	@echo "Deployed USDC contract to: ${USDC_CONTRACT}"
	cast send ${USDC_CONTRACT} "mint(address _to, uint256 _amount)" ${ADDRESS} 90000000000000000000000 --private-key ${SIGNERKEY}
	cast call -v ${USDC_CONTRACT} "balanceOf(address)" ${ADDRESS}

# Deploy WETH when using local anvil
deploy-mock-weth:
	@echo "Deploying WETH ERC20 contract for local anvil"
	$(eval WETH_CONTRACT := $(shell forge create --rpc-url 127.0.0.1:8545 --private-key ${SIGNERKEY} \
		contracts/lib/permit2/test/mocks/MockERC20.sol:MockERC20 \
		--constructor-args "WETH" "WETH" 18 1000000000000000000000 \
		| grep 'Deployed to:' \
		| sed -e 's/.*Deployed to: //g'))
	@echo "Deployed WETH contract to: ${WETH_CONTRACT}"
	cast send ${WETH_CONTRACT} "mint(address _to, uint256 _amount)" ${ADDRESS} 9000000000000000000000 --private-key ${SIGNERKEY}
	cast call -v ${WETH_CONTRACT} "balanceOf(address)" ${ADDRESS}

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
	forge inspect contracts/src/TransferSchedulerV1.sol:TransferSchedulerV1 abi > ./client/transferSchedulerABI.json
	sed -i '' -e "s/'.*';/'${TSCONTRACT}';/" client/constants.ts
	sed -i '' -e "s/'.*';/'${TSCONTRACT}';/" website/TransferScheduler/src/constants.ts

approve-transferscheduler-usdc:
	@echo "Approving USDC TransferScheduler contract spending: ${TSCONTRACT}"
	cast send -vv ${USDC_CONTRACT} "approve(address spender, uint256 amount)" ${TSCONTRACT} 100000000  --private-key ${ADDRESSKEY}

approve-transferscheduler-weth:
	@echo "Approving WETH TransferScheduler contract spending: ${TSCONTRACT}"
	cast send -vv ${WETH_CONTRACT} "approve(address spender, uint256 amount)" ${TSCONTRACT} 1000000000000000000  --private-key ${ADDRESSKEY}

start-relay: 
	@echo "Starting relay"
	cd relay && (ts-node relay-worker.ts & echo $$! >> $(PIDFILE))

start-webclient:
	cd website/TransferScheduler && npm run dev & echo $$! >> $(PIDFILE)

# TODO: remove not included 
start-otterscan:
	@echo "Starting otterscan"
	(cd ../otterscan && (npm run start-devnet & echo $$! >> $(PIDFILE)) & echo $$! >> $(PIDFILE))

test-contract:
	forge clean && forge test -vvvvv --fork-url https://mainnet.base.org

forked-base: start-anvil-base-fork transfer-usdc transfer-weth deploy-transferscheduler-contract approve-transferscheduler-usdc approve-transferscheduler-weth start-webclient start-relay start-otterscan

local: start-anvil-local deploy-mock-usdc deploy-mock-weth deploy-transferscheduler-contract approve-transferscheduler-usdc approve-transferscheduler-weth start-webclient start-relay start-otterscan

clean:
	forge clean
