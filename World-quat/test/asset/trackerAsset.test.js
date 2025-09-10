import test from 'node:test';
import assert from 'node:assert/strict';
import { vsub } from '../../src/math/vec3.js';

import { TrackerAsset } from '../../src/assets/trackerAsset.js';

// host entity stub returned by getHostEntity()
function makeHost() {
    return {
        position: [0, 0, 0],
        rotation: [1, 0, 0, 0], // identity
        mounts: {},
        findAssetsByKind(kind) {
            return kind === 'motor' ? this._motors || [] : [];
        },
        _motors: [],
    };
}

function makeMotorStub(opts = { radians: true }) {
    const calls = [];
    return {
        calls,
        addTurnRadians: opts.radians ? (dp, dy, dr) => calls.push({ kind: 'rad', dp, dy, dr }) : undefined,
        addTurn: opts.radians ? undefined : (dp, dy, dr) => calls.push({ kind: 'unit', dp, dy, dr }),
    };
}

// 1) Forward target: no command (exactly aligned; within deadband)
test('Tracker: no turn when target is straight ahead', () => {
    const host = makeHost();
    const motor = makeMotorStub({ radians: true });
    host._motors = [motor];

    const t = new TrackerAsset({ turnRate: 1.0, deadband: 0.0005 });
    t.host = host;

    t.setTargetPoint([0, 0, 10]);
    t.update(0.1);

    assert.equal(motor.calls.length, 0);
});

// 2) Yaw right: clamp to turnRate*dt
test('Tracker: yaw command is clamped to turnRate*dt (radians API)', () => {
    const host = makeHost(); // identity → local == world
    const motor = makeMotorStub({ radians: true });
    host._motors = [motor];

    const t = new TrackerAsset({ turnRate: 1.0, deadband: 0.0 });
    t.host = host;

    // target at (10,0,10) → yawErr = atan2(10,10) = π/4 ≈ 0.785398..., pitchErr = 0
    t.setTargetPoint([10, 0, 10]);
    t.update(0.1); // maxStep = 0.1

    assert.equal(motor.calls.length, 1);
    const c = motor.calls[0];
    assert.equal(c.kind, 'rad');
    // dp ≈ 0, dy = 0.1, dr = 0
    assert.ok(Math.abs(c.dp - 0) < 1e-12);
    assert.ok(Math.abs(c.dy - 0.1) < 1e-12);
    assert.ok(Math.abs(c.dr - 0) < 1e-12);
});

// 4) Deadband suppresses tiny errors
test('Tracker: deadband suppresses small errors', () => {
    const host = makeHost();
    const motor = makeMotorStub({ radians: true });
    host._motors = [motor];

    const t = new TrackerAsset({ turnRate: 2.0, deadband: 0.01 }); // 0.01 rad deadband
    t.host = host;

    // Very small lateral offset → yawErr ≈ atan2(0.01, 10) ≈ 0.001
    t.setTargetPoint([0.01, 0, 10]);
    t.update(0.5);

    assert.equal(motor.calls.length, 0);
});
