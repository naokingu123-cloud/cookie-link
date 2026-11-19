/* Produce an immutable motion recording with the production Cannon physics.
 * This is deliberately server-only. Clients receive positions, never run draws.
 */
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';

const SOURCE = new URL('./optimized/app-01.js', import.meta.url);
const round = value => Math.round(value * 100000) / 100000;

export async function recordRouletteV255({seed, fps = 30, maxSeconds = 300} = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('invalid_recording_seed');
  if (fps !== 30) throw Error('unsupported_recording_fps');
  const source = await fs.readFile(SOURCE, 'utf8');
  const cannonStart = source.indexOf('CANNON=(()=>{');
  const cannonEnd = source.indexOf('})();', cannonStart) + 5;
  const physicsStart = source.indexOf('const PHYSICS=(()=>{');
  const drawStart = source.indexOf('\nconst DRAW=', physicsStart) + 1;
  const drawEnd = source.indexOf('\nconst PIXELS=', drawStart);
  const groups = source.match(/^const NORMAL_DRAW_GROUPS=.*;$/m)?.[0];
  if (!(cannonStart >= 0 && cannonEnd > cannonStart && physicsStart > cannonEnd && drawStart > physicsStart && drawEnd > drawStart && groups)) throw Error('recording_source_changed');
  const code = 'const ' + source.slice(cannonStart, cannonEnd) + '\nconst localEightAllowed=true;\n' + groups + '\n' + source.slice(physicsStart, drawEnd) + '\nglobalThis.recordingClasses={CANNON,PHYSICS,DRAW};';
  const context = vm.createContext({console: {info(){}, warn(){}, error(){}}, performance});
  new vm.Script(code, {filename:'production-roulette-v255.js'}).runInContext(context, {timeout:20000});
  const {CANNON, PHYSICS, DRAW} = context.recordingClasses;
  const physics = new PHYSICS.RoulettePhysics(CANNON, {seed: seed || 0x100000000});
  physics.seed = seed >>> 0;
  const draw = new DRAW.DrawController(physics);
  const frames = [], hits = [], launches = [];
  physics.onHit = hit => hits.push({index: hits.length + 1, number: hit.pocket, atMs: round(hit.time * 1000), ball:hit.ball});
  draw.onLaunch = ball => launches.push({ball:ball.id, atMs:round(physics.time * 1000)});
  const capture = () => frames.push([round(physics.time * 1000), round(physics.angle), physics.balls.filter(ball => !ball.dead).map(ball => {
    const p = ball.body.position, q = ball.body.quaternion;
    return [ball.id, round(p.x), round(p.y), round(p.z), round(q.x), round(q.y), round(q.z), round(q.w), ball.resolved ? 1 : 0, ball.dead ? 1 : 0];
  }), [round(physics.rotor.quaternion.x),round(physics.rotor.quaternion.y),round(physics.rotor.quaternion.z),round(physics.rotor.quaternion.w)]]);
  draw.start();capture();
  let ticks = 0;
  // Fixed native 120 Hz with native groups [3,2,1,1,1] and five-second gaps.
  // No synthetic fallback, altered launch speed, skipped contact or forced HIT.
  while (draw.state !== 'complete' && physics.time < maxSeconds) {
    draw.update(); physics.step(1 / 120); ticks++;
    if (ticks % 4 === 0) capture();
  }
  if (hits.length !== 8 || new Set(hits.map(hit => hit.number)).size !== 8 || draw.state !== 'complete') throw Error('recording_physics_incomplete');
  if (frames.at(-1)[0] !== round(physics.time * 1000)) capture();
  return {version:255, kind:'production-physics-frames', fps, physicsHz:120,
    sourceHash:createHash('sha256').update(code).digest('hex'), durationMs:frames.at(-1)[0],
    frames, hits, launches, faults:physics.faults};
}

export function computeRecordingV255(input, {timeoutMs = 180000, signal} = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {workerData:input, execArgv:[]});
    let finished = false;
    const finish = (error, result) => {
      if (finished) return;finished = true;clearTimeout(timer);signal?.removeEventListener('abort', cancel);
      void worker.terminate();error ? reject(error) : resolve(result);
    };
    const cancel = () => finish(Error('recording_cancelled'));
    const timer = setTimeout(() => finish(Error('recording_timeout')), timeoutMs);timer.unref?.();
    worker.once('message', message => message.ok ? finish(null, message.recording) : finish(Error(message.error || 'recording_failed')));
    worker.once('error', error => finish(error));
    worker.once('exit', code => {if (!finished) finish(Error('recording_worker_exited_' + code));});
    if (signal?.aborted) cancel();else signal?.addEventListener('abort', cancel, {once:true});
  });
}

if (!isMainThread) {
  try {parentPort.postMessage({ok:true, recording:await recordRouletteV255(workerData)});}
  catch (error) {parentPort.postMessage({ok:false, error:String(error?.message || error)});}
}
