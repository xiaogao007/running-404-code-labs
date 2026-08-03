const EXACT_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseExactVersion(value) {
  const match = EXACT_VERSION.exec(value);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareVersions(left, right) {
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }

  return 0;
}

export function validateProject({ manifest, lockfile, policy }) {
  const errors = [];
  const requested = manifest.dependencies?.next;

  if (!requested) {
    errors.push("package.json must declare next as a production dependency");
    return errors;
  }

  const requestedVersion = parseExactVersion(requested);
  if (!requestedVersion) {
    errors.push(`next must use an exact version, received: ${requested}`);
    return errors;
  }

  const rootLockedVersion = lockfile.packages?.[""]?.dependencies?.next;
  const installedVersion = lockfile.packages?.["node_modules/next"]?.version;

  if (rootLockedVersion !== requested) {
    errors.push(
      `package-lock root dependency (${rootLockedVersion ?? "missing"}) does not match package.json (${requested})`,
    );
  }

  if (installedVersion !== requested) {
    errors.push(
      `package-lock installed next (${installedVersion ?? "missing"}) does not match package.json (${requested})`,
    );
  }

  const branch = policy.allowedBranches.find(
    (candidate) =>
      candidate.major === requestedVersion.major &&
      candidate.minor === requestedVersion.minor,
  );

  if (!branch) {
    errors.push(
      `next ${requested} is outside the policy's reviewed LTS branches`,
    );
    return errors;
  }

  const minimum = parseExactVersion(branch.minimumPatchedVersion);
  if (!minimum) {
    errors.push(
      `policy contains an invalid minimum version: ${branch.minimumPatchedVersion}`,
    );
    return errors;
  }

  if (compareVersions(requestedVersion, minimum) < 0) {
    errors.push(
      `next ${requested} is below the reviewed floor ${branch.minimumPatchedVersion}`,
    );
  }

  return errors;
}
