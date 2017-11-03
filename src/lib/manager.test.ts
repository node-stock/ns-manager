import * as assert from 'power-assert';
import { OrderSide, LimitOrder, OrderType, TradeType, EventType } from 'ns-types';
import { Manager } from './manager';
import { Store as db } from 'ns-store';

const manager = new Manager();

const testSetSignal = async (done: any) => {
  const res = await manager.signal.set({
    symbol: '6664',
    side: OrderSide.Buy,
    price: 2000,
    timeframe: '5min',
    notes: '备注项目'
  });
  console.log(res);
  assert(res);
  done();
}

const testGetSignal = async (done: any) => {
  const findOpt = {
    symbol: '6664',
    side: OrderSide.Buy
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
  done();
}

const testRemoveSignal = async (done: any) => {
  const signal = await manager.signal.get({
    symbol: '6664',
    side: OrderSide.Buy
  })
  assert(signal);
  if (signal && signal.id) {
    const res = await manager.signal.remove(signal.id);
    console.log(res);
    assert(res);
  }
  done();
}

const testGetBalance = async (done: any) => {

  const res = await db.model.Account.findById('test');
  console.log('Account: ', res)
  if (!res) {
    await db.model.Account.upsert({
      id: 'test',
      balance: 300000
    });
  }
  const balance = await manager.asset.getBalance('test');
  console.log(balance);
  assert(true);
  const balance2 = await manager.asset.getBalance('testxxx');
  console.log(balance2);
  assert(balance2 === 0);
  done();
}

const testBuyTrader = async (done: any) => {
  const order: LimitOrder = {
    symbol: '6664',
    side: OrderSide.Buy,
    orderType: OrderType.Limit,
    tradeType: TradeType.Margin,
    eventType: EventType.Order,
    price: 2000,
    amount: 100
  };
  const account = {
    id: 'test',
    balance: 300000
  }
  await manager.trader.set(account, order);
  assert(true);
  done();
}

const testSellTrader = async (done: any) => {
  const order: LimitOrder = {
    symbol: '6664',
    side: OrderSide.Sell,
    orderType: OrderType.Limit,
    tradeType: TradeType.Margin,
    eventType: EventType.Order,
    price: 2100,
    amount: 100
  };
  const account = {
    id: 'test',
    balance: await manager.asset.getBalance('test')
  }
  await manager.trader.set(account, order);
  assert(true);
  done();
}

// TODO PositionManager test

describe('ns-manager', () => {
  it('存储信号', function (done) {
    this.timeout(20000);
    testSetSignal(done);
  });
  it('获取信号', function (done) {
    this.timeout(20000);
    testGetSignal(done);
  });
  it('删除信号', function (done) {
    this.timeout(20000);
    testRemoveSignal(done);
  });
  it('获取余额', function (done) {
    this.timeout(20000);
    testGetBalance(done);
  });
  it('记录买单交易', function (done) {
    this.timeout(20000);
    testBuyTrader(done);
  });
  it('记录卖单交易', function (done) {
    this.timeout(20000);
    testSellTrader(done);
  });
  after(() => {
    manager.destroy();
  })
});
