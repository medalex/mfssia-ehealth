// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
/**
 * @title MfssiaOracleConsumer
 * @notice Chainlink Functions consumer for MFSSIA batch verification of challenge instances
 * @dev Deploys once, stores governance-approved verification logic, triggers decentralized oracle calls
 *      Results are emitted as events — backend listens and handles DKG anchoring
 */
contract MfssiaOracleConsumer is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    FunctionsClient
{
    using FunctionsRequest for FunctionsRequest.Request;

    // Chainlink Functions DON configuration
    bytes32 public donId;
    string public batchVerificationLogic; // Full JavaScript source (pure compute batch verifier)

    // Track pending verifications: requestId → instanceKey (keccak256(subjectDid + instanceId))
    mapping(bytes32 => bytes32) public pendingVerifications;

    // Events for off-chain monitoring and audit trail
    event VerificationRequested(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        string challengeSet,
        address indexed requester
    );

    event VerificationResponseReceived(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        bytes response,
        bytes err
    );

    event VerificationFailed(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        string reason
    );

    constructor(address router) FunctionsClient(router) {}

    /**
     * @notice Initialize contract (called via proxy)
     * @param _donId Chainlink Functions DON ID
     * @param _batchVerificationLogic Full JavaScript source code for batch verification
     */
    function initialize(
        bytes32 _donId,
        string calldata _batchVerificationLogic
    ) external initializer {
__Ownable_init(msg.sender);        // ← Pass msg.sender as owner
__UUPSUpgradeable_init();

        donId = _donId;
        batchVerificationLogic = _batchVerificationLogic;
    }

    /**
     * @notice Trigger batch verification for a challenge instance
     * @param instanceKey keccak256(abi.encode(subjectDid, instanceId))
     * @param challengeSet Code of the challenge set (e.g., "mfssia:Example-D")
     * @param args Array of arguments passed to the JavaScript verifier
     *             Expected: [evidencesJson, mandatoryIdsJson, optionalIdsJson, aggregationRule, confidenceThreshold, minChallenges]
     * @param subscriptionId Chainlink Functions subscription ID
     * @param gasLimit Gas limit for the callback
     * @return requestId The Chainlink Functions request ID
     */
    function requestVerification(
        bytes32 instanceKey,
        string calldata challengeSet,
        string[] calldata args,
        uint64 subscriptionId,
        uint32 gasLimit
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequest(
            FunctionsRequest.Location.Inline,
            FunctionsRequest.CodeLanguage.JavaScript,
            batchVerificationLogic
        );

        if (args.length > 0) {
            req.setArgs(args);
        }

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        pendingVerifications[requestId] = instanceKey;

        emit VerificationRequested(
            requestId,
            instanceKey,
            challengeSet,
            msg.sender
        );
    }

    /**
     * @notice Chainlink Functions fulfillment callback
     * @dev Emits raw response — backend parses and applies policy + anchors to DKG
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        bytes32 instanceKey = pendingVerifications[requestId];

        emit VerificationResponseReceived(
            requestId,
            instanceKey,
            response,
            err
        );

        if (instanceKey == bytes32(0)) {
            // Unknown request — safety guard
            return;
        }

        if (err.length > 0) {
            emit VerificationFailed(
                requestId,
                instanceKey,
                'Oracle execution error'
            );
        }

        // Do NOT delete mapping here — backend confirms fulfillment
        // This allows replay protection and idempotency
    }

    /**
     * @notice Optional: Admin cleanup of stale requests
     */
    function clearPending(bytes32 requestId) external onlyOwner {
        require(
            pendingVerifications[requestId] != bytes32(0),
            'No pending request'
        );
        delete pendingVerifications[requestId];
    }

    /**
     * @notice Upgradeability authorization
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
