import { Deferred } from "./Deferred";

describe("Deferred", () => {
  it("resolves", async () => {
    const deferred = new Deferred<number>();
    setTimeout(() => deferred.resolve(1), 100);
    const result = await deferred.promise;
    expect(result).equals(1);
  });

  it("rejects", async () => {
    const deferred = new Deferred<number>();
    setTimeout(() => deferred.reject(1), 100);
    try {
      const result = await deferred.promise;
      assert.fail();
    } catch (e) {
      expect(e).equals(1);
    }
  });
});
