import * as assert from 'power-assert';
import * as types from 'ns-types';
import { TransactionManager, OrderManager, SignalManager } from './manager';
import { PositionManager, AccountManager } from './manager';
import { Store as db, Account } from 'ns-store';

const testSetSignal = async () => {
  const res = await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Buy,
    price: '2000',
    timeframe: '5min',
    notes: '备注项目'
  });
  assert(res);
  await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Buy,
    price: '2001',
    timeframe: '5min',
    notes: '备注项目'
  });
  await SignalManager.set({
    symbol: '6664',
    side: types.OrderSide.Sell,
    price: '2001',
    timeframe: '5min',
    notes: '备注项目'
  });

}

const testUpdateSignal = async () => {
  await SignalManager.set({
    // id: '390925',
    symbol: '6664',
    side: types.OrderSide.Buy,
    type: types.SymbolType.stock,
    price: '2000',
    timeframe: '5min',
    backtest: '1',
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
    const res = await SignalManager.removeById(signal.id);
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
  const order: types.Order = {
    account_id: 'test',
    symbol: types.Pair.XRP_JPY,
    price: '1675000',
    amount: '0.00421125',
    symbolType: types.SymbolType.cryptocoin,
    eventType: types.EventType.Order,
    tradeType: types.TradeType.Spot,
    orderType: types.OrderType.Limit,
    side: types.OrderSide.Buy,
    backtest: '1'
  }
  await TransactionManager.set(order);
  assert(true);
}

const testBuyCloseTrader = async () => {
  const userId = 'test';
  if (!await AccountManager.get(userId)) {
    assert(false, '未查询到test账号信息，请确认好在进行交易测试！');
  }
  const order: types.Order = {
    account_id: 'test',
    eventId: Date.now(),
    symbol: types.Pair.BTC_JPY,
    price: '1685000',
    amount: '0.00421125',
    symbolType: types.SymbolType.cryptocoin,
    eventType: types.EventType.Order,
    tradeType: types.TradeType.Spot,
    orderType: types.OrderType.Limit,
    side: types.OrderSide.BuyClose,
    backtest: '1'
  }
  await TransactionManager.set(order);
  assert(true);
}

const testSellTrader = async () => {
  const order: types.Order = {
    account_id: 'test',
    symbol: '6664',
    side: types.OrderSide.Sell,
    orderType: types.OrderType.Limit,
    tradeType: types.TradeType.Margin,
    eventType: types.EventType.Order,
    symbolType: types.SymbolType.stock,
    price: '2000',
    amount: '100',
    backtest: '1'
  };
  const account = await AccountManager.get('test');
  if (!account) {
    assert(false, '未查询到test账号信息！');
    return
  }
  await TransactionManager.set(order);
  assert(true);
}

const testSetPosition = async () => {
  const positions: types.Position[] = [{
    account_id: 'test',
    symbol: types.Pair.BTC_JPY,
    type: types.SymbolType.cryptocoin,
    side: types.OrderSide.Buy,
    price: '1804897',
    quantity: '0.00325',
    backtest: '1'
  }];

  const account: types.Account = {
    id: 'test',
    "assets": [
      {
        "asset": "jpy",
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "amount_precision": 4,
        "onhand_amount": "419139.4737",
        "locked_amount": "0.0000",
        "free_amount": "419139.4737"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "btc",
        "amount_precision": 8,
        "onhand_amount": "0.025",
        "locked_amount": "0.00000000",
        "free_amount": "0.025"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "ltc",
        "amount_precision": 8,
        "onhand_amount": "0.00000000",
        "locked_amount": "0.00000000",
        "free_amount": "0.00000000"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "xrp",
        "amount_precision": 6,
        "onhand_amount": "539.369900",
        "locked_amount": "539.369900",
        "free_amount": "0.000000"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "eth",
        "amount_precision": 8,
        "onhand_amount": "0.00000000",
        "locked_amount": "0.00000000",
        "free_amount": "0.00000000"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "mona",
        "amount_precision": 8,
        "onhand_amount": "0.05000000",
        "locked_amount": "0.00000000",
        "free_amount": "0.05000000"
      },
      {
        account_id: 'test',
        type: types.SymbolType.cryptocoin,
        backtest: '1',
        "asset": "bcc",
        "amount_precision": 8,
        "onhand_amount": "0.00000000",
        "locked_amount": "0.00000000",
        "free_amount": "0.00000000"
      }
    ],
    backtest: '1',
    positions,// positions: [], // 
    transactions: []
  }
  const order: types.Order = {
    account_id: 'test',
    symbol: types.Pair.BTC_JPY,
    price: '1675000',
    amount: '0.00421125',
    symbolType: types.SymbolType.cryptocoin,
    eventType: types.EventType.Order,
    tradeType: types.TradeType.Spot,
    orderType: types.OrderType.Limit,
    side: types.OrderSide.BuyClose,
    backtest: '1'
  }
  await PositionManager.set(account, order);
  assert(true);
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
    price: '2300',
    symbol: 'btc_jpy',
    side: types.OrderSide.Buy,
    quantity: '0.001',
    status: types.OrderStatus.Unfilled
  };
  await OrderManager.set(order);
  const res = await db.model.Order.findAll();
  assert(res.length === 1);
}

const testUpdateStatus = async () => {
  await OrderManager.updateStatus();
}

const testGetOrder = async () => {
  const order: types.Model.Order = {
    account_id: 'coin',
    signal_id: '390928',
    symbol: 'btc_jpy',
    side: types.OrderSide.Buy
  };
  const res = await OrderManager.get(order, true);
  console.log(res);
}

const testRemoveAllSignal = async () => {
  await SignalManager.removeAll();
}

describe('ns-manager', () => {
  before(async () => {
    await db.init(require('config').store);
  });

  /*it('更新信号', testUpdateSignal);
  it('存储信号', testSetSignal);
  it('获取信号', testGetSignal);
  it('删除信号', testRemoveSignal);*/
  //it('建仓交易', testBuyTrader);
  // it('平仓交易', testBuyCloseTrader);
  /*it('获取资产', testGetAsset);
  it('获取全部用户资产', testGetAllAsset);
  it('测试存储订单', testOrderManager);*/
  // it('测试更新订单状态', testUpdateStatus);
  // it('测试获取订单', testGetOrder);
  it('测试删除全部信号', testRemoveAllSignal);

  after(async () => {
    await db.close();
  });
});
