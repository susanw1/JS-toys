import test from 'node:test';
import assert from 'node:assert/strict';

import { MotorAsset } from '../../src/assets/motorAsset.js';

function makeHostEntity() {
    return {
        position: [0, 0, 0],
        rotation: [1, 0, 0, 0], // identity
        translateLocal(v) {
            // For these tests, identity rotation ⇒ direct add
            this.position[0] += v[0];
            this.position[1] += v[1];
            this.position[2] += v[2];
        },
        _calls: [],
        rotateAroundLocal(axis, angle) { this._calls.push({ kind: 'local', axis, angle }); },
        rotateAroundWorld(axis, angle) { this._calls.push({ kind: 'world', axis, angle }); },
    };
}

// translation — world space
test('MotorAsset: world-space translation adds [3,0,0] after 1s @ speed 3', () => {
    const m = new MotorAsset({ space: 'world', linearSpeed: 3 });
    const host = makeHostEntity();
    m.host = host;

    m.addMove(1, 0, 0);
    m.update(1.0);

    assert.deepEqual(host.position, [3, 0, 0]);
});

// translation — local space
test('MotorAsset: local-space translation uses host.translateLocal', () => {
    const m = new MotorAsset({ space: 'local', linearSpeed: 2 });
    const host = makeHostEntity();
    m.host = host;

    m.addMove(0, 0, 1);
    m.update(0.5); // distance = 1 * 2 * 0.5 = 1

    assert.deepEqual(host.position, [0, 0, 1]);
});

// rotation (unitless intents scaled by angularSpeed*dt)
test('MotorAsset: turn intents call rotateAround*(...) with scaled radians', () => {
    const m = new MotorAsset({ angularSpeed: 2.0, worldUpYaw: false });
    const host = makeHostEntity();
    m.host = host;

    m.addTurn(0.5, 0.25, -0.75);
    m.update(0.5);

    const calls = host._calls;
    const expectedPitch = 0.5 * 2.0 * 0.5; // 0.5
    const expectedYaw   = 0.25 * 2.0 * 0.5; // 0.25
    const expectedRoll  = -0.75 * 2.0 * 0.5; // -0.75

    // order: pitch(x), roll(z), then yaw(local y)
    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0], { kind: 'local', axis: [1, 0, 0], angle: expectedPitch });
    assert.deepEqual(calls[1], { kind: 'local', axis: [0, 0, 1], angle: expectedRoll });
    assert.deepEqual(calls[2], { kind: 'local', axis: [0, 1, 0], angle: expectedYaw });
});

// worldUpYaw=true routes yaw to world
test('MotorAsset: worldUpYaw=true calls rotateAroundWorld for yaw', () => {
    const m = new MotorAsset({ angularSpeed: 1.0, worldUpYaw: true });
    const host = makeHostEntity();
    m.host = host;

    m.addTurn(0, 1, 0); // yaw only
    m.update(1.0);

    const calls = host._calls;
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { kind: 'world', axis: [0, 1, 0], angle: 1.0 });
});

// direct radians pass-through
test('MotorAsset: turnRad calls pass-through given radians', () => {
    const m = new MotorAsset({ worldUpYaw: true });
    const host = makeHostEntity();
    m.host = host;

    m.addTurnRadians(0.1, -0.2, 0.3);
    m.update(1.0);

    const calls = host._calls;
    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0], { kind: 'local', axis: [1, 0, 0], angle: 0.1 });
    assert.deepEqual(calls[1], { kind: 'local', axis: [0, 0, 1], angle: 0.3 });
    assert.deepEqual(calls[2], { kind: 'world', axis: [0, 1, 0], angle: -0.2 });
});

// intent clearing
test('MotorAsset: clearIntentEachFrame=true zeros intents after update', () => {
    const m = new MotorAsset({ clearIntentEachFrame: true });
    const host = makeHostEntity();
    m.host = host;

    m.addMove(1, 2, 3);
    m.addTurn(1, 1, 1);
    m.addTurnRadians(1, 1, 1);
    m.update(0.016);

    assert.deepEqual(m.intent.move, [0, 0, 0]);
    assert.deepEqual(m.intent.turn, [0, 0, 0]);
    assert.deepEqual(m.intent.turnRad, [0, 0, 0]);
});
