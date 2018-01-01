import { Store as db, Position, Account, Order } from 'ns-store';
import * as types from 'ns-types';
import { Calc, IAccPosi } from 'ns-calc';
import { Log, Util } from 'ns-common';
import * as moment from 'moment';
import { Sequelize } from 'sequelize-typescript';
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

  static async set(signal: types.Model.Signal) {
    const dbSignal = await this.get(signal);
    // 数据库中存在数据时，删除已存信号
    if (dbSignal) {
      await this.removeById(String(dbSignal.id));
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
    if (signal.backtest) {
      delOpt.where.backtest = signal.backtest;
      // delOpt.where.mocktime = signal.mocktime;
    }
    await db.model.Signal.destroy(delOpt);
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
      return accountList;
    }
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

    // 保存交易记录
    Log.system.info('保存订单记录');
    await db.model.Order.upsert(order);

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
      if (!config.trader.test) {
        res = (await bitbank.getOrder(order.symbol, order.id).toPromise());
        Log.system.info('真实环境，获取订单信息: ', JSON.stringify(res, null, 2));
      } else {
        type sideType = 'buy' | 'sell';
        let side: sideType = 'buy'
        if (order.side === types.OrderSide.BuyClose) {
          side = 'sell';
        }
        res = {
          order_id: Date.now(),
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
          await TransactionManager.set(order.account_id, {
            eventId: Number(order.id),
            symbol: order.symbol,
            price: order.price,
            amount: order.quantity,
            symbolType: <types.SymbolType>order.type,
            eventType: types.EventType.Order,
            tradeType: types.TradeType.Spot,
            orderType: types.OrderType.Limit,
            side: <types.OrderSide>order.side,
            backtest: order.backtest
          });
        }
      }
    }
    Log.system.info('更新订单状态[终了]');
  }
}

/**
  * @class
  * @classdesc 交易管理器
  */
export class TransactionManager {

  static async set(accountId: string, order: types.Order) {
    Log.system.info('记录交易信息[启动]');

    // 获取当前账户资产信息
    const account = await AccountManager.get(accountId);
    if (!account) {
      Log.system.error('获取当前账户资产信息为空！');
      return;
    }

    // 保存交易记录
    Log.system.info('保存交易记录');
    const transaction: types.Model.Transaction = Object.assign({}, order, {
      id: null,
      order: order.eventId ? String(order.eventId) : undefined,
      type: order.symbolType,
      account_id: accountId,
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
    let accPosi: IAccPosi | undefined;
    switch (order.side) {
      // 多单买入
      case types.OrderSide.Buy:
        accPosi = Calc.openPosition({ account, order });
        break;
      // 多单卖出
      case types.OrderSide.BuyClose:
        accPosi = Calc.closePosition({ account, order });
        break;
    }

    if (!accPosi || !accPosi.account) {
      Log.system.error('更新持仓[异常终了]');
      return;
    }
    if ((new BigNumber(accPosi.account.bitcoin)).isNegative()
      || (new BigNumber(accPosi.account.balance)).isNegative()) {
      Log.system.error(`余额（余币）：${accPosi.account.balance}(${accPosi.account.bitcoin})为负数，更新持仓[异常终了]`);
      return;
    }

    if (accPosi.position) {
      // 持仓数量为零 并且有持仓id
      if (accPosi.position.quantity === "0" && accPosi.position.id) {
        Log.system.info('持仓数量为零,执行清仓');
        // 清仓
        await db.model.Position.destroy({
          where: {
            id: accPosi.position.id
          }
        });
      } else {
        Log.system.info('更新持仓', JSON.stringify(accPosi.position, null, 2));
        // 更新持仓
        await db.model.Position.upsert(accPosi.position);
      }
    }
    Log.system.info('更新账户资产', JSON.stringify(account, null, 2));
    // 更新账户资产
    await db.model.Account.upsert(account);

    Log.system.info('更新持仓[终了]');
  }

  static async remove(id: string) {
    return await db.model.Position.destroy({
      where: { id }
    });
  }
}
