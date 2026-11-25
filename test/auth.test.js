
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  tokenFor,
  requireAuth,
  allow
} from '../server/auth.js';

const TEST_SECRET = 'test-only-secret-with-at-least-32-characters';

function withEnv(values, callback) {
  const previous = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
  }

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const user = {
  id: 'u1',
  organization_id: 'o1',
  role: 'EMPLOYEE',
  first_name: 'Test',
  last_name: 'User'
};

test('creates a signed JWT with the expected tenant claims', () => {
  withEnv(
    { JWT_SECRET: TEST_SECRET, NODE_ENV: 'test' },
    () => {
      const token = tokenFor(user);
      const decoded = jwt.verify(token, TEST_SECRET);

      assert.equal(token.split('.').length, 3);
      assert.equal(decoded.sub, 'u1');
      assert.equal(decoded.org, 'o1');
      assert.equal(decoded.role, 'EMPLOYEE');
      assert.equal(decoded.name, 'Test User');
      assert.ok(decoded.exp > decoded.iat);
    }
  );
});

test('rejects token generation when JWT_SECRET is missing', () => {
  withEnv(
    { JWT_SECRET: undefined, NODE_ENV: 'test' },
    () => {
      assert.throws(() => tokenFor(user), /JWT_SECRET is required/);
    }
  );
});

test('rejects a JWT_SECRET shorter than 32 characters', () => {
  withEnv(
    { JWT_SECRET: 'too-short', NODE_ENV: 'test' },
    () => {
      assert.throws(() => tokenFor(user), /at least 32 characters/);
    }
  );
});

test('rejects the known development secret in production', () => {
  withEnv(
    {
      JWT_SECRET: 'development-secret-change-me-123456789',
      NODE_ENV: 'production'
    },
    () => {
      assert.throws(() => tokenFor(user), /cannot be used in production/);
    }
  );
});

test('authenticates a valid bearer token', () => {
  withEnv(
    { JWT_SECRET: TEST_SECRET, NODE_ENV: 'test' },
    () => {
      const token = tokenFor(user);
      const req = {
        headers: { authorization: `Bearer ${token}` }
      };

      const res = {
        statusCode: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        }
      };

      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(req.user.sub, 'u1');
      assert.equal(req.user.org, 'o1');
    }
  );
});

test('rejects requests without an authorization token', () => {
  const req = { headers: {} };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  requireAuth(req, res, () => {
    assert.fail('next() should not be called');
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.errorCode, 'UNAUTHENTICATED');
});

test('rejects an invalid bearer token', () => {
  withEnv(
    { JWT_SECRET: TEST_SECRET, NODE_ENV: 'test' },
    () => {
      const req = {
        headers: { authorization: 'Bearer invalid.token.value' }
      };

      const res = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        }
      };

      requireAuth(req, res, () => {
        assert.fail('next() should not be called');
      });

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.errorCode, 'INVALID_TOKEN');
    }
  );
});

test('allows only users with permitted roles', () => {
  const req = { user: { role: 'ADMIN' } };
  let nextCalled = false;

  allow('ADMIN', 'MANAGER')(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('rejects users without a permitted role', () => {
  const req = { user: { role: 'EMPLOYEE' } };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  allow('ADMIN', 'MANAGER')(req, res, () => {
    assert.fail('next() should not be called');
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorCode, 'FORBIDDEN');
});
