export function randomizePath(project) {
  const drawn = crypto.getRandomValues(new Uint32Array(1))[0];
  project.seed = drawn === project.seed ? (drawn + 1) >>> 0 : drawn;
  delete project.scenario;
}
