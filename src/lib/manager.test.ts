import * as assert from 'power-assert';
import * as types from 'ns-types';
import { Manager } from './manager';
import { Store as db, Account } from 'ns-store';

const manager = new Manager();

const testSetSignal = async () => {
  const res = await manager.signal.set({
    symbol: '6664',
    side: types.OrderSide.Buy,
    price: 2000,
    timeframe: '5min',
    notes: '备注项目'
  });
  console.log(res);
  assert(res);
}

const testGetSignal = async () => {
  const findOpt = {
    symbol: '6664',
    side: types.OrderSide.Buy
  };
  const signal = await manager.signal.get(findOpt);
  console.log(`where:${JSON.stringify(findOpt)} \nsignal:`, signal);
  assert(signal);
  if (signal) {
    assert(signal.symbol === '6664');
  }

  const findOpt2 = {
    symbol: '6664'
  };
  const signal2 = await manager.signal.get(findOpt2);
  console.log(`\nwhere:${JSON.stringify(findOpt2)} \nsignal:`, signal2);
  assert(signal2);
  if (signal2) {
    assert(signal2.symbol === '6664');
  }
}

const testRemoveSignal = async () => {
  const signal = await manager.signal.get({
    symbol: '6664',
    side: types.OrderSide.Buy
  })
  assert(signal);
  if (signal && signal.id) {
    const res = await manager.signal.remove(signal.id);
    console.log(res);
    assert(res);
  }
}

const testGetAsset = async () => {
  const res = await manager.account.get('stoc');
  console.log(res)
}

const testBuyTrader = async () => {
  const userId = 'test';
  if (!await manager.account.get(userId)) {
    assert(false, '未查询到test账号信息，请确认好在进行交易测试！');
  }
  const order: types.LimitOrder = {
    symbol: '6664',
    side: types.OrderSide.Buy,
    orderType: types.OrderType.Limit,
    tradeType: types.TradeType.Margin,
    eventType: types.EventType.Order,
    price: 2000,
    amount: 100
  };
  await manager.saveTrade(userId, order);
  assert(true);
}

const testSellTrader = async () => {
  const order: types.LimitOrder = {
    symbol: '6664',
    side: types.OrderSide.Sell,
    orderType: types.OrderType.Limit,
    tradeType: types.TradeType.Margin,
    eventType: types.EventType.Order,
    price: 2100,
    amount: 100
  };
  const account = await manager.account.get('test');
  if (!account) {
    assert(false, '未查询到test账号信息！');
    return
  }
  await manager.saveTrade(account.id, order);
  assert(true);
}

const testSetPosition = async () => {
  const symbol = 'M6664';
  const accountId = 'test';
  // 建立多仓
  const position: types.Model.Position = {
    account_id: accountId,
    symbol,
    side: types.OrderSide.Buy,
    price: 2100,
    quantity: 100
  };
  await manager.position.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 2200;
  await manager.position.set(position);
  // 建立空仓
  position.side = types.OrderSide.Sell;
  position.price = 2120;
  await manager.position.set(position);
  // 建立空仓
  position.side = types.OrderSide.Sell;
  position.price = 2000;
  await manager.position.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 1900;
  await manager.position.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2250;
  await manager.position.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 2300;
  await manager.position.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2400;
  await manager.position.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2100;
  await manager.position.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2120;
  await manager.position.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2230;
  await manager.position.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2320;
  await manager.position.set(position);
  assert(true);
}

describe('ns-manager', () => {
  before(async () => {
    await manager.init();
  });

  it('存储信号', testSetSignal);
  it('获取信号', testGetSignal);
  it('删除信号', testRemoveSignal);
  it('记录买单交易', testBuyTrader);
  it('记录卖单交易', testSellTrader);

  it('获取资产', testGetAsset);
  it('更新持仓', testSetPosition);
  after(async () => {
    await manager.destroy();
  });
});
