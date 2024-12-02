"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const permit2_sdk_1 = require("@uniswap/permit2-sdk");
describe("VaultSignautureTransfer", function () {
    async function loadContracts() {
        const permit2 = await hardhat_1.ethers.getContractAt("IPermit2", permit2_sdk_1.PERMIT2_ADDRESS);
        const Vault = await hardhat_1.ethers.getContractFactory("VaultSignatureTransfer");
        const vault = await Vault.deploy(permit2_sdk_1.PERMIT2_ADDRESS);
        const [account] = await hardhat_1.ethers.getSigners();
        return { vault, permit2, account };
    }
    async function deployERC20() {
        const ERC20 = await hardhat_1.ethers.getContractFactory("ERC20Mock");
        const erc20 = await ERC20.deploy("ERC20Mock", "EM");
        return erc20;
    }
    describe("SignatureTransfer", function () {
        it("Should deposit", async function () {
            const { vault, permit2, account } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const amount = 1000;
            await erc20.mint(account.address, amount);
            await erc20.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await account._signTypedData(domain, types, values);
            await vault.connect(account).deposit(amount, permit, signature);
            (0, chai_1.expect)(await vault.tokenBalancesByUser(account.address, erc20.address), amount);
            (0, chai_1.expect)(await erc20.balanceOf(account.address), 0);
            (0, chai_1.expect)(await erc20.balanceOf(vault.address), amount);
        });
        it("Should not reuse permit", async function () {
            const { vault, account } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const amount = 1000;
            await erc20.mint(account.address, amount);
            await erc20.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await account._signTypedData(domain, types, values);
            await vault.connect(account).deposit(amount, permit, signature);
            await (0, chai_1.expect)(vault.connect(account).deposit(amount, permit, signature)).to.be.reverted;
        });
        it("Should not use others permit", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const [acc1, acc2] = await hardhat_1.ethers.getSigners();
            const erc20 = await deployERC20();
            const amount = 1000;
            await erc20.mint(acc1.address, amount);
            await erc20.connect(acc1).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await acc1._signTypedData(domain, types, values);
            await (0, chai_1.expect)(vault.connect(acc2).deposit(amount, permit, signature)).to.be.reverted;
        });
    });
    describe("Batch", function () {
        it("Should depositBatch", async function () {
            const { vault, permit2, account } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20A = await deployERC20();
            const erc20B = await deployERC20();
            const amount = 1000;
            await erc20A.mint(account.address, amount);
            await erc20B.mint(account.address, amount);
            await erc20A.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            await erc20B.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: [
                    {
                        token: erc20A.address,
                        amount: amount
                    },
                    {
                        token: erc20B.address,
                        amount: amount
                    }
                ],
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await account._signTypedData(domain, types, values);
            await vault.connect(account).depositBatch(amount, permit, signature);
            (0, chai_1.expect)(await vault.tokenBalancesByUser(account.address, erc20A.address), amount);
            (0, chai_1.expect)(await vault.tokenBalancesByUser(account.address, erc20B.address), amount);
            (0, chai_1.expect)(await erc20A.balanceOf(account.address), 0);
            (0, chai_1.expect)(await erc20B.balanceOf(account.address), 0);
            (0, chai_1.expect)(await erc20A.balanceOf(vault.address), 0);
            (0, chai_1.expect)(await erc20B.balanceOf(vault.address), 0);
        });
        it("Should not reuse permit", async function () {
            const { vault, account } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20A = await deployERC20();
            const erc20B = await deployERC20();
            const amount = 1000;
            await erc20A.mint(account.address, amount);
            await erc20B.mint(account.address, amount);
            await erc20A.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            await erc20B.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: [
                    {
                        token: erc20A.address,
                        amount: amount
                    },
                    {
                        token: erc20B.address,
                        amount: amount
                    }
                ],
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await account._signTypedData(domain, types, values);
            await vault.connect(account).depositBatch(amount, permit, signature);
            await (0, chai_1.expect)(vault.connect(account).depositBatch(amount, permit, signature)).to.be.reverted;
        });
        it("Should not use others permit", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const [acc1, acc2] = await hardhat_1.ethers.getSigners();
            const erc20A = await deployERC20();
            const erc20B = await deployERC20();
            const amount = 1000;
            await erc20A.mint(acc1.address, amount);
            await erc20B.mint(acc1.address, amount);
            await erc20A.connect(acc1).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            await erc20B.connect(acc1).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: [
                    {
                        token: erc20A.address,
                        amount: amount
                    },
                    {
                        token: erc20B.address,
                        amount: amount
                    }
                ],
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await acc1._signTypedData(domain, types, values);
            await (0, chai_1.expect)(vault.connect(acc2).depositBatch(amount, permit, signature)).to.be.reverted;
        });
    });
    describe("Withdraw", function () {
        it("Should withdraw", async function () {
            const { vault, account } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const amount = 1000;
            await erc20.mint(account.address, amount);
            await erc20.connect(account).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await account._signTypedData(domain, types, values);
            await vault.connect(account).deposit(amount, permit, signature);
            await vault.connect(account).withdrawERC20(erc20.address, 1);
            (0, chai_1.expect)(await erc20.balanceOf(account.address), 1);
            (0, chai_1.expect)(await erc20.balanceOf(vault.address), amount - 1);
            (0, chai_1.expect)(await vault.tokenBalancesByUser(account.address, erc20.address), amount - 1);
        });
        it("Should not withdraw others", async function () {
            const { vault } = await (0, hardhat_network_helpers_1.loadFixture)(loadContracts);
            const erc20 = await deployERC20();
            const [acc1, acc2] = await hardhat_1.ethers.getSigners();
            const amount = 1000;
            await erc20.mint(acc1.address, amount);
            await erc20.connect(acc1).approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.constants.MaxUint256); // approve max
            const permit = {
                permitted: {
                    token: erc20.address,
                    amount: amount
                },
                spender: vault.address,
                nonce: 1,
                deadline: ethers_1.constants.MaxUint256
            };
            const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(permit, permit2_sdk_1.PERMIT2_ADDRESS, 1);
            let signature = await acc1._signTypedData(domain, types, values);
            await vault.connect(acc1).deposit(amount, permit, signature);
            await (0, chai_1.expect)(vault.connect(acc2).withdrawERC20(erc20.address, 1)).to.be.reverted;
        });
    });
});
