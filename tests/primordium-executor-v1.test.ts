import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  beforeEach,
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  createBalanceSharesManagerUpdateEvent,
  createCallExecutedEvent,
  createChangedGuardEvent,
  createDisabledModuleEvent,
  createDistributorUpdateEvent,
  createEnabledModuleEvent,
  createMinDelayUpdateEvent,
  createSharesOnboarderUpdateEvent,
} from "./primordium-executor-v1-utils";
import { address1, address3 } from "./test-utils";
import {
  handleBalanceSharesManagerUpdate,
  handleCallExecuted,
  handleChangedGuard,
  handleDisabledModule,
  handleDistributorUpdate,
  handleEnabledModule,
  handleMinDelayUpdate,
  handleSharesOnboarderUpdate,
} from "../src/primordium-executor-v1";
import { getExecutorData, getExecutorModule } from "../src/utils";
import { ExecutorCallExecutedEvent, ExecutorModule } from "../generated/schema";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("executor data updates...", () => {
  beforeEach(clearStore);

  test("handleBalanceSharesManagerUpdate()", () => {
    const event = createBalanceSharesManagerUpdateEvent(
      Address.zero(),
      address1
    );
    handleBalanceSharesManagerUpdate(event);

    let executorData = getExecutorData();
    assert.bytesEquals(
      event.params.newBalanceSharesManager,
      executorData.balanceSharesManager
    );
  });

  test("handleSharesOnboarderUpdate()", () => {
    const event = createSharesOnboarderUpdateEvent(Address.zero(), address1);
    handleSharesOnboarderUpdate(event);

    let executorData = getExecutorData();
    assert.bytesEquals(
      event.params.newSharesOnboarder,
      executorData.sharesOnboarder
    );
  });

  test("handleDistributorUpdate()", () => {
    const event = createDistributorUpdateEvent(Address.zero(), address1);
    handleDistributorUpdate(event);

    let executorData = getExecutorData();
    assert.bytesEquals(event.params.newDistributor, executorData.distributor);
  });

  test("handleChangedGuard()", () => {
    const event = createChangedGuardEvent(address1);
    handleChangedGuard(event);

    let executorData = getExecutorData();
    assert.bytesEquals(event.params.guard, executorData.guard);
  });

  test("handleMinDelayUpdate()", () => {
    const event = createMinDelayUpdateEvent(BigInt.zero(), BigInt.fromI32(500));
    handleMinDelayUpdate(event);

    let executorData = getExecutorData();
    assert.bigIntEquals(event.params.newMinDelay, executorData.minDelay);
  });
});

describe("executor module updates...", () => {
  beforeAll(clearStore);

  test("handleEnabledModule()", () => {
    const event = createEnabledModuleEvent(address1);
    handleEnabledModule(event);

    let module = ExecutorModule.load(address1) as ExecutorModule;
    assert.booleanEquals(true, module.enabled);
    assert.bigIntEquals(event.block.number, module.enabledAtBlock);
    assert.bigIntEquals(event.block.timestamp, module.enabledAtTimestamp);
  });

  test("handleDisabledModule()", () => {
    const event = createDisabledModuleEvent(address1);
    handleDisabledModule(event);

    let module = ExecutorModule.load(address1);
    assert.assertTrue(!module);

    const reenableEvent = createEnabledModuleEvent(address1);
    reenableEvent.block.number = event.block.number.plus(BigInt.fromI32(1));
    handleEnabledModule(reenableEvent);

    module = ExecutorModule.load(address1) as ExecutorModule;
    assert.booleanEquals(true, module.enabled);
    assert.bigIntEquals(reenableEvent.block.number, module.enabledAtBlock);
  });
});

test("handleCallExecuted()", () => {
  const event = createCallExecutedEvent(
    address1,
    BigInt.fromI32(1),
    Bytes.fromUTF8("random calldata bytes"),
    0
  );
  handleCallExecuted(event);

  let entity = ExecutorCallExecutedEvent.load(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  ) as ExecutorCallExecutedEvent;
  assert.bytesEquals(event.params.target, entity.target);
  assert.bigIntEquals(event.params.txValue, entity.value);
  assert.bytesEquals(event.params.data, entity.calldata);
  assert.i32Equals(event.params.operation, entity.operation);
  assert.bigIntEquals(event.block.number, entity.blockNumber);
  assert.bigIntEquals(event.block.timestamp, entity.blockTimestamp);
});