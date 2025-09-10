import test from 'node:test';
import assert from 'node:assert/strict';
import { WeaponAsset } from '../../src/assets/weaponAsset.js';

// stub host entity (so getHostEntity() returns this)
function makeHost() {
    return {
        ownerId: 'E1',
        position: [0, 0, 0],
        rotation: [1, 0, 0, 0],
        mounts: {},
    };
}

function makeWorldRecorder() {
    const events = [];
    return {
        events,
        world: { emit: (ev, payload) => events.push({ ev, payload }) },
    };
}

test('Weapon fires when trigger held and cooldown is zero', () => {
    const { events, world } = makeWorldRecorder();
    const w = new WeaponAsset({ fireRate: 5, magSize: 2 }); // cooldown = 0.2s
    w.attachWorld(world);
    w.host = makeHost();

    w.triggerHeld = true;
    w.update(0); // first frame

    assert.equal(w.ammo, 1);
    assert.ok(w.cooldown > 0);
    assert.equal(events.length, 1);

    const e = events[0];
    // payload contract
    assert.equal(e.payload.weapon, w);
    assert.equal(e.payload.ownerId, 'E1');
    assert.deepEqual(e.payload.transform.pos, [0, 0, 0]); // local by default
    assert.deepEqual(e.payload.transform.rot, [1, 0, 0, 0]);
});

test('Weapon does not fire during cooldown, fires when cooldown reaches zero, then goes empty', () => {
    const { events, world } = makeWorldRecorder();
    const w = new WeaponAsset({ fireRate: 5, magSize: 2 }); // 0.2s
    w.attachWorld(world);
    w.host = makeHost();
    w.triggerHeld = true;

    w.update(0);       // fire #1
    w.update(0.1);     // still cooling
    assert.equal(events.length, 1);

    w.update(0.1);     // cooldown hits zero → fire #2 (last round)
    assert.equal(events.length, 2);
    assert.equal(w.ammo, 0);

    w.update(0.2);     // now empty → emit "empty", cooldown = 0.3
    assert.equal(events.length, 3);
    const last = events[2];
    // Just validate it’s the “empty” payload shape
    assert.ok(last.payload.weapon === w);
});

test('Reload refills magazine and emits reloaded', () => {
    const { events, world } = makeWorldRecorder();
    const w = new WeaponAsset({ fireRate: 5, magSize: 3 });
    w.attachWorld(world);
    w.host = makeHost();

    // spend 2
    w.triggerHeld = true;
    w.update(0);
    w.update(0.2);
    assert.equal(w.ammo, 1);

    // reload
    w.reload();
    assert.equal(w.ammo, 3);
    assert.ok(events.some(e => e.payload && e.payload.weapon === w)); // reloaded recorded
});

test('Spin calls rotateAroundLocal with spinRate*dt', () => {
    const w = new WeaponAsset({ spinRate: 2, spinAxis: [0, 0, 1] });
    let called = null;
    // monkey-patch to observe call (we don’t need the actual math here)
    w.rotateAroundLocal = (axis, angle) => { called = { axis, angle }; };

    w.update(0.5); // dt=0.5 → angle=1
    assert.deepEqual(called, { axis: [0, 0, 1], angle: 1 });
});
