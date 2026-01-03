import { ethers, upgrades } from 'hardhat';
import chai from 'chai';
import { MfssiaOracleConsumer } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const { expect } = chai;

describe('MfssiaOracleConsumer Contract', () => {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let consumer: MfssiaOracleConsumer;

  const routerAddress = '0x0000000000000000000000000000000000000001'; // mock
  const donId = ethers.encodeBytes32String('fun-sepolia-1');

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory('MfssiaOracleConsumer');

    consumer = (await upgrades.deployProxy(Factory, [routerAddress], {
      constructorArgs: [routerAddress],
      kind: 'uups',
      unsafeAllow: ['constructor', 'state-variable-immutable'],
    })) as unknown as MfssiaOracleConsumer;

    await consumer.waitForDeployment();

    // Initialize with DON ID and empty script (for testing)
    await consumer.initialize(donId, "return '0x'");
  });

  describe('Deployment & Initialization', () => {
    it('Should set correct owner', async () => {
      expect(await consumer.owner()).to.equal(owner.address);
    });

    it('Should store DON ID correctly', async () => {
      expect(await consumer.donId()).to.equal(donId);
    });

    it('Should store verification logic', async () => {
      const logic = await consumer.batchVerificationLogic();
      expect(logic).to.equal("return '0x'");
    });
  });

  describe('requestVerification', () => {
    const instanceKey = ethers.keccak256(ethers.toUtf8Bytes('test-key'));
    const challengeSet = 'mfssia:Test-A';
    const args = ['arg1', 'arg2'];
    const subscriptionId = 123;
    const gasLimit = 500000;

    it('Should allow owner to request verification', async () => {
      const tx = await consumer.requestVerification(
        instanceKey,
        challengeSet,
        args,
        subscriptionId,
        gasLimit,
      );

      await expect(tx)
        .to.emit(consumer, 'VerificationRequested')
        .withArgs(
          await consumer.lastRequestId(), // requestId is internal, but we can check mapping
          instanceKey,
          challengeSet,
          owner.address,
        );

      // Check pending mapping
      const pending = await consumer.pendingVerifications(
        await consumer.lastRequestId(),
      );
      expect(pending).to.equal(instanceKey);
    });

    it('Should revert if non-owner calls', async () => {
      await expect(
        consumer
          .connect(user)
          .requestVerification(
            instanceKey,
            challengeSet,
            args,
            subscriptionId,
            gasLimit,
          ),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('fulfillRequest (mocked response)', () => {
    let requestId: string;

    beforeEach(async () => {
      const instanceKey = ethers.keccak256(ethers.toUtf8Bytes('mock-key'));
      const tx = await consumer.requestVerification(
        instanceKey,
        'mfssia:Test',
        [],
        999,
        500000,
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) =>
          consumer.interface.parseLog(log).name === 'VerificationRequested',
      );
      requestId = consumer.interface.parseLog(event!).args.requestId;
    });

    it('Should emit VerificationResponseReceived on fulfillment', async () => {
      const response = ethers.toUtf8Bytes('{"finalResult":"PASS"}');
      const err = '0x';

      // Direct call to internal function (onlyOwner in real, but we can force in test)
      await expect(consumer.__fulfillRequest(requestId, response, err))
        .to.emit(consumer, 'VerificationResponseReceived')
        .withArgs(
          requestId,
          await consumer.pendingVerifications(requestId),
          response,
          err,
        );
    });

    it('Should emit VerificationFailed if err is present', async () => {
      const response = '0x';
      const err = ethers.toUtf8Bytes('Oracle error');

      await expect(consumer.__fulfillRequest(requestId, response, err))
        .to.emit(consumer, 'VerificationFailed')
        .withArgs(
          requestId,
          await consumer.pendingVerifications(requestId),
          'Oracle execution error',
        );
    });
  });

  describe('clearPending', () => {
    it('Should allow owner to clear pending request', async () => {
      const instanceKey = ethers.keccak256(ethers.toUtf8Bytes('clear-test'));
      const tx = await consumer.requestVerification(
        instanceKey,
        'test',
        [],
        999,
        500000,
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) =>
          consumer.interface.parseLog(log).name === 'VerificationRequested',
      );
      const requestId = consumer.interface.parseLog(event!).args.requestId;

      await expect(consumer.clearPending(requestId)).to.emit(
        consumer,
        'VerificationResponseReceived',
      ).not.to.be.reverted; // no, just clears mapping

      expect(await consumer.pendingVerifications(requestId)).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('Should revert if non-owner calls clearPending', async () => {
      await expect(
        consumer.connect(user).clearPending(ethers.ZeroHash),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
