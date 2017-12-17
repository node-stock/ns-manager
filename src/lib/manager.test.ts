import * as assert from 'power-assert';
import * as types from 'ns-types';
import { TransactionManager, OrderManager, SignalManager } from './manager';
import { PositionManager, AccountManager } from './manager';
import { Store as db, Account } from 'ns-store';

const testSetSignal = async () => {
  const res = await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Buy,
    price: 2000,
    timeframe: '5min',
    notes: '备注项目'
  });
  assert(res === true);
  await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Buy,
    price: 2001,
    timeframe: '5min',
    notes: '备注项目'
  });
  await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Sell,
    price: 2001,
    timeframe: '5min',
    notes: '备注项目'
  });

}

const testGetSignal = async () => {
  const findOpt = {
    symbol: '6664',
    side: types.OrderSide.Buy
  };
  const signal = await SignalManager.get(findOpt);
  console.log(`where:${JSON.stringify(findOpt)} \nsignal:`, signal);
  assert(signal);
  if (signal) {
    assert(signal.symbol === '6664');
  }

  const findOpt2 = {
    symbol: '6664'
  };
  const signal2 = await SignalManager.get(findOpt2);
  console.log(`\nwhere:${JSON.stringify(findOpt2)} \nsignal:`, signal2);
  assert(signal2);
  if (signal2) {
    assert(signal2.symbol === '6664');
  }
}

const testRemoveSignal = async () => {
  const signal = await SignalManager.get({
    symbol: '6664',
    side: types.OrderSide.Buy
  })
  assert(signal);
  if (signal && signal.id) {
    const res = await SignalManager.remove(signal.id);
    console.log(res);
    assert(res);
  }
}

const testGetAsset = async () => {
  const res = await AccountManager.get('stoc');
  console.log(res)
}

const testBuyTrader = async () => {
  const userId = 'test';
  if (!await AccountManager.get(userId)) {
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
  const account = {
    id: userId,
    balance: 300000
  }
  await TransactionManager.set(userId, order);
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
  const account = await AccountManager.get('test');
  if (!account) {
    assert(false, '未查询到test账号信息！');
    return
  }
  await TransactionManager.set(account.id, order);
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
  await PositionManager.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 2200;
  await PositionManager.set(position);
  // 建立空仓
  position.side = types.OrderSide.Sell;
  position.price = 2120;
  await PositionManager.set(position);
  // 建立空仓
  position.side = types.OrderSide.Sell;
  position.price = 2000;
  await PositionManager.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 1900;
  await PositionManager.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2250;
  await PositionManager.set(position);
  // 平空仓
  position.side = types.OrderSide.SellClose;
  position.price = 2300;
  await PositionManager.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2400;
  await PositionManager.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2100;
  await PositionManager.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2120;
  await PositionManager.set(position);
  // 建立多仓
  position.side = types.OrderSide.Buy;
  position.price = 2230;
  await PositionManager.set(position);
  // 平多仓
  position.side = types.OrderSide.BuyClose;
  position.price = 2320;
  await PositionManager.set(position);
  assert(true);
}

const testSetCoinPosition = async () => {
  const symbol = 'bcc_jpy';
  const accountId = 'coin';
  // 建立多仓
  const position: types.Model.Position = {
    account_id: accountId,
    symbol,
    side: types.OrderSide.BuyClose,
    price: 204897,
    quantity: 0.01
  };
  await PositionManager.set(position);
}

const testGetAllAsset = async () => {
  const res = await AccountManager.getAll();
  console.log(res)
}

const testOrderManager = async () => {
  await db.sequelize.query('delete from `order`');
  const accountId = 'coin';
  const order: types.Model.Order = {
    id: '2',
    account_id: accountId,
    price: 2300,
    symbol: 'btc_jpy',
    side: types.OrderSide.Buy,
    quantity: 0.001,
    status: types.OrderStatus.Unfilled
  };
  await OrderManager.set(order);
  const res = await db.model.Order.findAll();
  assert(res.length === 1);
}

describe('ns-manager', () => {
  before(async () => {
    await db.init(require('config').store);
  });

  it('存储信号', testSetSignal);
  it('获取信号', testGetSignal);
  it('删除信号', testRemoveSignal);
  it('记录买单交易', testBuyTrader);
  it('记录卖单交易', testSellTrader);

  it('获取资产', testGetAsset);
  it('获取全部用户资产', testGetAllAsset);

  it('更新持仓', testSetPosition);
  it('更新数字货币持仓', testSetCoinPosition);
  it('测试存储订单', testOrderManager);

  after(async () => {
    await db.close();
  });
});
