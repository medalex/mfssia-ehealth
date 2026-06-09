pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template ForceBool() {
    signal input in;
    in * (in - 1) === 0;
}

template IsZero() {
    signal input in;
    signal output out;
    signal inv;

    inv <-- in != 0 ? 1 / in : 0;
    out <== 1 - in * inv;
    in * out === 0;
}

template IsEqual() {
    signal input a;
    signal input b;
    signal output out;

    component iz = IsZero();
    iz.in <== a - b;
    out <== iz.out;
}

template PoseidonHash2() {
    signal input left;
    signal input right;
    signal output out;

    component h = Poseidon(2);
    h.inputs[0] <== left;
    h.inputs[1] <== right;
    out <== h.out;
}

// Select one value from an array with a one-hot selector.
// This template also constrains exactly one selector entry to be 1.
template OneHotSelect(n) {
    signal input values[n];
    signal input selector[n];
    signal output selected;

    component selectorBool[n];
    signal selectorSum[n + 1];
    signal selectedAcc[n + 1];

    selectorSum[0] <== 0;
    selectedAcc[0] <== 0;

    for (var i = 0; i < n; i++) {
        selectorBool[i] = ForceBool();
        selectorBool[i].in <== selector[i];

        selectorSum[i + 1] <== selectorSum[i] + selector[i];
        selectedAcc[i + 1] <== selectedAcc[i] + selector[i] * values[i];
    }

    selectorSum[n] === 1;
    selected <== selectedAcc[n];
}

// Generates a Poseidon Merkle root and the verification path for one doctor.
// This sample component supports exactly 8 credential leaves, i.e., depth 3.
// selectedDoctor must be a one-hot vector where the chosen doctor has value 1.
template DoctorCredentialMerklePathGenerator8() {
    signal input doctorCredentials[8];
    signal input selectedDoctor[8];

    signal output selectedCredentialHash;
    signal output merkleRoot;
    signal output pathSiblings[3];
    signal output pathBits[3];

    component leafSelect = OneHotSelect(8);

    component h0[4];
    signal level1[4];

    component h1[2];
    signal level2[2];

    component h2;

    signal sibling0Candidates[8];
    signal sibling1Candidates[8];
    signal sibling2Candidates[8];

    component sibling0Select = OneHotSelect(8);
    component sibling1Select = OneHotSelect(8);
    component sibling2Select = OneHotSelect(8);

    for (var i = 0; i < 8; i++) {
        leafSelect.values[i] <== doctorCredentials[i];
        leafSelect.selector[i] <== selectedDoctor[i];
    }
    selectedCredentialHash <== leafSelect.selected;

    // Build tree: 8 leaves -> 4 nodes.
    for (var i0 = 0; i0 < 4; i0++) {
        h0[i0] = PoseidonHash2();
        h0[i0].left <== doctorCredentials[2 * i0];
        h0[i0].right <== doctorCredentials[2 * i0 + 1];
        level1[i0] <== h0[i0].out;
    }

    // Build tree: 4 nodes -> 2 nodes.
    for (var i1 = 0; i1 < 2; i1++) {
        h1[i1] = PoseidonHash2();
        h1[i1].left <== level1[2 * i1];
        h1[i1].right <== level1[2 * i1 + 1];
        level2[i1] <== h1[i1].out;
    }

    // Build root: 2 nodes -> root.
    h2 = PoseidonHash2();
    h2.left <== level2[0];
    h2.right <== level2[1];
    merkleRoot <== h2.out;

    // Path bits: 0 means current node is left child; 1 means current node is right child.
    pathBits[0] <== selectedDoctor[1] + selectedDoctor[3] + selectedDoctor[5] + selectedDoctor[7];
    pathBits[1] <== selectedDoctor[2] + selectedDoctor[3] + selectedDoctor[6] + selectedDoctor[7];
    pathBits[2] <== selectedDoctor[4] + selectedDoctor[5] + selectedDoctor[6] + selectedDoctor[7];

    // Candidate siblings at level 0.
    sibling0Candidates[0] <== doctorCredentials[1];
    sibling0Candidates[1] <== doctorCredentials[0];
    sibling0Candidates[2] <== doctorCredentials[3];
    sibling0Candidates[3] <== doctorCredentials[2];
    sibling0Candidates[4] <== doctorCredentials[5];
    sibling0Candidates[5] <== doctorCredentials[4];
    sibling0Candidates[6] <== doctorCredentials[7];
    sibling0Candidates[7] <== doctorCredentials[6];

    // Candidate siblings at level 1.
    sibling1Candidates[0] <== level1[1];
    sibling1Candidates[1] <== level1[1];
    sibling1Candidates[2] <== level1[0];
    sibling1Candidates[3] <== level1[0];
    sibling1Candidates[4] <== level1[3];
    sibling1Candidates[5] <== level1[3];
    sibling1Candidates[6] <== level1[2];
    sibling1Candidates[7] <== level1[2];

    // Candidate siblings at level 2.
    sibling2Candidates[0] <== level2[1];
    sibling2Candidates[1] <== level2[1];
    sibling2Candidates[2] <== level2[1];
    sibling2Candidates[3] <== level2[1];
    sibling2Candidates[4] <== level2[0];
    sibling2Candidates[5] <== level2[0];
    sibling2Candidates[6] <== level2[0];
    sibling2Candidates[7] <== level2[0];

    for (var j = 0; j < 8; j++) {
        sibling0Select.values[j] <== sibling0Candidates[j];
        sibling0Select.selector[j] <== selectedDoctor[j];

        sibling1Select.values[j] <== sibling1Candidates[j];
        sibling1Select.selector[j] <== selectedDoctor[j];

        sibling2Select.values[j] <== sibling2Candidates[j];
        sibling2Select.selector[j] <== selectedDoctor[j];
    }

    pathSiblings[0] <== sibling0Select.selected;
    pathSiblings[1] <== sibling1Select.selected;
    pathSiblings[2] <== sibling2Select.selected;
}

component main {public [doctorCredentials]} = DoctorCredentialMerklePathGenerator8();


/*INPUT= {
  "doctorCredentials": ["111", "222", "333", "444", "555", "666", "777", "888"],
  "selectedDoctor": ["0", "0", "0", "0", "1", "0", "0", "0"]
}
*/