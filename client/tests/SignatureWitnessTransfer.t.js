"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const permit2_sdk_1 = require("@uniswap/permit2-sdk");
describe("VaultSignautureWitnessTransfer", function () {
    async function loadContracts() {
        const permit2 = await hardhat_1.ethers.getContractAt("IPermit2", permit2_sdk_1.PERMIT2_ADDRESS);
        const Vault = await hardhat_1.ethers.getContractFactory("VaultSignatureWitnessTransfer");
        const vault = await Vault.deploy(permit2_sdk_1.PERMIT2_ADDRESS);
        const [account] = await hardhat_1.ethers.getSigners();
        return { vault, permit2, account };
    }
    async function deployERC20() {
        const ERC20 = await hardhat_1.ethers.getContractFactory("ERC20Mock");
        const erc20 = await ERC20.deploy("ERC20Mock", "EM");
        return erc20;
    }
    describe("SignatureWitnessTransfer", function () {
        it("Should deposit", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const [owner, user, caller] = await hardhat_1.ethers.getSigners();
            const amount = 1000;
            await erc20.mint(owner.address, amount);
            await erc20.connect(owner).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 11,
                deadline: ethers_1.constants.MaxUint256
            };
            const witness = {
                witnessTypeName: 'Witness',
                witnessType: { Witness: [{ name: 'user', type: 'address' }] },
                witness: { user: user.address },
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1, witness);
            let signature = await owner._signTypedData(domain, types, values);
            await vault.connect(caller).deposit(amount, erc20.address, owner.address, user.address, permit, signature);
            (0, chai_1.expect)(await vault.tokenBalancesByUser(user.address, erc20.address), amount);
            (0, chai_1.expect)(await erc20.balanceOf(owner.address), 0);
            (0, chai_1.expect)(await erc20.balanceOf(vault.address), amount);
        });
        it("Should not reuse permit", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const [owner, user, caller] = await hardhat_1.ethers.getSigners();
            const amount = 1000;
            await erc20.mint(owner.address, amount);
            await erc20.connect(owner).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 12,
                deadline: ethers_1.constants.MaxUint256
            };
            const witness = {
                witnessTypeName: 'Witness',
                witnessType: { Witness: [{ name: 'user', type: 'address' }] },
                witness: { user: user.address },
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1, witness);
            let signature = await owner._signTypedData(domain, types, values);
            await vault.connect(caller).deposit(amount, erc20.address, owner.address, user.address, permit, signature);
            await (0, chai_1.expect)(vault.connect(caller).deposit(amount, erc20.address, owner.address, user.address, permit, signature)).to.be.reverted;
        });
        it("Should not allow changing user", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const [owner, user, caller] = await hardhat_1.ethers.getSigners();
            const erc20 = await deployERC20();
            const amount = 1000;
            await erc20.mint(owner.address, amount);
            await erc20.connect(owner).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 13,
                deadline: ethers_1.constants.MaxUint256
            };
            const witness = {
                witnessTypeName: 'Witness',
                witnessType: { Witness: [{ name: 'user', type: 'address' }] },
                witness: { user: user.address },
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1, witness);
            let signature = await owner._signTypedData(domain, types, values);
            await (0, chai_1.expect)(vault.connect(caller).deposit(amount, erc20.address, owner.address, caller.address, permit, signature)).to.be.reverted;
        });
    });
});
