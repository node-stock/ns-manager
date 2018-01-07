import { Store as db, Position, Account, Asset, Order, Signal } from 'ns-store';
import * as types from 'ns-types';
import { Calc, ICalcOutput } from 'ns-calc';
import { Log, Util } from 'ns-common';
import * as moment from 'moment';
import { Sequelize } from 'sequelize-typescript';
import { SlackAlerter } from 'ns-alerter';
import { BigNumber } from 'BigNumber.js';
import { Bitbank, BitbankApiActiveOrdersOptions, BitbankApiOrder } from 'bitbank-handler';
// process.env.NODE_ENV = 'development';

const config = require('config');
const bitbank = new Bitbank({
  apiKey: config.trader.apiKey,
  apiSecret: config.trader.secret
});

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

  static async get(signal: types.Model.Signal): Promise<types.Model.Signal | null> {
    const findOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signal.symbol
      }
    };
    if (signal.side) {
      findOpt.where.side = signal.side;
    }
    if (signal.backtest) {
      findOpt.where.backtest = signal.backtest;
      // findOpt.where.mocktime = signal.mocktime;
    }
    return <types.Model.Signal | null>await db.model.Signal.find(findOpt);
  }

  static async getAll(signal: types.Model.Signal): Promise<types.Model.Signal[]> {
    const findOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signal.symbol
      }
    };
    if (signal.side) {
      findOpt.where.side = signal.side;
    }
    if (signal.backtest) {
      findOpt.where.backtest = signal.backtest;
      // findOpt.where.mocktime = signal.mocktime;
    }
    return <Signal[]>await db.model.Signal.findAll(findOpt);
  }

  static async set(signal: types.Model.Signal) {
    // 新增信号是删除之前信号
    if (!signal.id) {
      const delSignal: types.Model.Signal = Object.assign({}, signal);
      delete delSignal.side;
      // 删除已存信号
      await SignalManager.remove(delSignal);
    }
    // 写入数据库
    return await db.model.Signal.upsert(signal);
  }

  static async removeById(id: string) {
    return await db.model.Signal.destroy({
      where: { id }
    });
  }

  static async remove(signal: types.Model.Signal) {
    const delOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signal.symbol
      }
    };
    if (signal.side) {
      delOpt.where.side = signal.side;
    }
    if (signal.timeframe) {
      delOpt.where.timeframe = signal.timeframe;
    }
    if (signal.backtest) {
      delOpt.where.backtest = signal.backtest;
      // delOpt.where.mocktime = signal.mocktime;
    }
    await db.model.Signal.destroy(delOpt);
  }

  static async removeAll() {
    await db.model.Signal.destroy({
      where: {}
    });
  }
}

/**
  * @class
  * @classdesc 资产管理器
  */
export class AccountManager {

  static async get(accountId: string): Promise<types.Account | undefined> {
    const account = <types.Model.Account | undefined>await db.model.Account.findById(accountId, {
      raw: true
    });
    if (account) {
      const positions = await db.model.Position.findAll({
        raw: true,
        where: {
          account_id: accountId
        }
      });
      account.positions = <Position[] | undefined>positions;

      const assets = await db.model.Asset.findAll({
        raw: true,
        where: {
          account_id: accountId
        }
      });
      account.assets = <Asset[] | undefined>assets;
    }
    return <types.Account>account;
  }

  static async getAll(): Promise<types.Model.Account[] | undefined> {
    const accountList = <types.Model.Account[] | undefined>await db.model.Account.findAll({ raw: true });
    if (accountList && accountList.length > 0) {
      const accountIds: string[] = [];
      accountList.forEach((account) => {
        accountIds.push(account.id);
      })
      const positions = <Position[] | undefined>await db.model.Position.findAll({ raw: true });
      if (positions && positions.length > 0) {
        accountList.forEach((account) => {
          const accPosiList = positions.filter((posi) => {
            return posi.account_id === account.id;
          });
          account.positions = accPosiList;
        })
      }
      const assets = <Asset[] | undefined>await db.model.Asset.findAll({ raw: true });
      if (assets && assets.length > 0) {
        accountList.forEach((account) => {
          const accAssetList = assets.filter((asset) => {
            return asset.account_id === account.id;
          });
          account.assets = accAssetList;
        })
      }
      return accountList;
    }
  }

  static async updateAssets(assets: types.Asset[]) {
    await db.model.Asset.bulkCreate(assets, {
      updateOnDuplicate: [
        'onhand_amount',
        'locked_amount',
        'free_amount',
        'updated_at'
      ]
    });
  }
}

/**
  * @class
  * @classdesc 订单管理器
  */
export class OrderManager {

  static async set(order: types.Model.Order) {
    Log.system.info('记录订单信息[启动]');

    // 获取当前账户资产信息
    const account = await AccountManager.get(String(order.account_id));
    if (!account) {
      Log.system.error('获取当前账户资产信息为空！');
      return;
    }

    // 保存订单记录
    Log.system.info('保存订单记录');
    await db.model.Order.upsert(order);
    // 计算账户资产
    const calcOutput = Calc.order({
      account, order: {
        account_id: String(order.account_id),
        price: String(order.price),
        symbol: order.symbol,
        symbolType: <types.SymbolType>order.type,
        orderType: <types.OrderType>order.order_type,
        tradeType: types.TradeType.Spot,
        side: <types.OrderSide>order.side,
        amount: String(order.quantity),
        eventType: types.EventType.Order,
        backtest: String(order.backtest),
        mocktime: order.mocktime
      }
    });
    if (!calcOutput || !calcOutput.account) {
      Log.system.error('计算账户资产出错[异常终了]');
      return;
    }

    Log.system.info('更新账户资产', JSON.stringify(calcOutput.account.assets, null, 2));
    // 更新账户资产
    await AccountManager.updateAssets(calcOutput.account.assets);

    Log.system.info('记录交易信息[终了]');
  }

  static async updateStatus() {
    Log.system.info('更新订单状态[启动]');
    const orders = <Order[]>await db.model.Order.findAll({
      raw: true,
      where: {
        status: types.OrderStatus.Unfilled,
        type: types.SymbolType.cryptocoin
      }
    });
    Log.system.info('待更新订单数：', orders.length);
    if (orders.length === 0) {
      Log.system.info('更新订单状态[终了]');
      return;
    }
    for (const order of orders) {
      let res: BitbankApiOrder;
      if (order.backtest === '0') {
        res = (await bitbank.getOrder(order.symbol, order.id).toPromise());
        Log.system.info('真实环境，获取订单信息: ', JSON.stringify(res, null, 2));
      } else {
        type sideType = 'buy' | 'sell';
        let side: sideType = 'buy'
        if (order.side === types.OrderSide.BuyClose) {
          side = 'sell';
        }
        res = {
          order_id: Number(order.id),
          pair: order.symbol,
          side,
          type: 'limit',
          start_amount: order.quantity,
          remaining_amount: order.quantity,
          executed_amount: order.quantity,
          price: order.price,
          average_price: order.price,
          ordered_at: Date.now(),
          status: types.OrderStatus.FullyFilled
        };
        Log.system.info('仿真环境，模拟获取订单信息: ', res);
      }
      if (res.status === types.OrderStatus.FullyFilled
        || res.status === types.OrderStatus.CanceledUnfilled) {
        Log.system.info(`更新${order.symbol}订单: ${order.id}`);
        order.status = res.status;
        Log.system.info('更新订单状态：', order.status);
        await db.model.Order.upsert(order);
        await db.model.Order.destroy({
          where: {
            id: order.id
          }
        });
        // 订单成功时记录持仓表
        if (res.status === types.OrderStatus.FullyFilled) {
          Log.system.info('订单成功,记录持仓表');
          await TransactionManager.set({
            id: order.id,
            account_id: order.account_id,
            symbol: order.symbol,
            price: order.price,
            amount: order.quantity,
            symbolType: <types.SymbolType>order.type,
            eventType: types.EventType.Order,
            tradeType: types.TradeType.Spot,
            orderType: <types.OrderType>order.order_type,
            side: <types.OrderSide>order.side,
            backtest: order.backtest
          });
        }
      }
    }
    Log.system.info('更新订单状态[终了]');
  }

  static async get(order: types.Model.Order, showRemoved: boolean): Promise<types.Model.Order | null> {
    const option = <{ [Attr: string]: any }>{
      where: {},
      raw: true
    }
    if (showRemoved) {
      option.paranoid = false;
    }
    Object.assign(option.where, order);
    return <types.Model.Order | null>await db.model.Order.findOne(option);
  }
}

/**
  * @class
  * @classdesc 交易管理器
  */
export class TransactionManager {

  static async set(order: types.Order) {
    Log.system.info('记录交易信息[启动]');

    // 获取当前账户资产信息
    const account = await AccountManager.get(order.account_id);
    if (!account) {
      Log.system.error('获取当前账户资产信息为空！');
      return;
    }

    // 保存交易记录
    Log.system.info('保存交易记录');
    const transaction: types.Model.Transaction = Object.assign({}, order, {
      id: null,
      order_no: order.id ? String(order.id) : undefined,
      type: order.symbolType,
      quantity: order.amount
    });
    await db.model.Transaction.upsert(transaction);

    await PositionManager.set(account, order);

    Log.system.info('记录交易信息[终了]');
  }
}

/**
  * @class
  * @classdesc 持仓管理器
  */
export class PositionManager {

  static async get(position: types.Position): Promise<types.Position | null> {
    const findOpt: { [Attr: string]: any } = {
      raw: true,
      where: {
        symbol: position.symbol,
        account_id: position.account_id,
        side: position.side
      }
    };
    if (position.backtest) {
      findOpt.where.backtest = position.backtest;
    }
    return <types.Position | null>await db.model.Position.find(findOpt);
  }

  /**
   * 更新持仓
   *
   * @param account 账户情报
   * @param order  成交订单
   */
  static async set(account: types.Account, order: types.Order) {
    Log.system.info('更新持仓[启动]');
    let calcOutput: ICalcOutput | undefined;
    switch (order.side) {
      // 多单买入
      case types.OrderSide.Buy:
        calcOutput = Calc.openPosition({ account, order });
        break;
      // 多单卖出
      case types.OrderSide.BuyClose:
        calcOutput = Calc.closePosition({ account, order });
        break;
    }

    if (!calcOutput || !calcOutput.account) {
      Log.system.error('更新持仓[异常终了]');
      return;
    }

    if (calcOutput.position) {
      // 持仓数量为零 并且有持仓id
      if (calcOutput.position.quantity === "0" && calcOutput.position.id) {
        Log.system.info('持仓数量为零,执行清仓');
        // 清仓
        await db.model.Position.destroy({
          where: {
            id: calcOutput.position.id
          }
        });
      } else {
        Log.system.info('更新持仓', JSON.stringify(calcOutput.position, null, 2));
        // 更新持仓
        await db.model.Position.upsert(calcOutput.position);
      }
    }
    if (calcOutput.earning) {
      // 记录收益表
      Log.system.info('更新收益表', JSON.stringify(calcOutput.earning, null, 2));
      await db.model.Earning.upsert(calcOutput.earning);
      await SlackAlerter.sendEarning(calcOutput.earning);
    }
    Log.system.info('更新账户资产', JSON.stringify(calcOutput.account.assets, null, 2));
    // 更新账户资产
    await AccountManager.updateAssets(calcOutput.account.assets);

    Log.system.info('更新持仓[终了]');
  }

  static async remove(id: string) {
    return await db.model.Position.destroy({
      where: { id }
    });
  }
}
