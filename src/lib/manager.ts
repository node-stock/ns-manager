import { Store as db, Position } from 'ns-store';
import * as types from 'ns-types';
import { access } from 'fs';

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

  async get(signal: types.Model.Signal): Promise<types.Model.Signal | null> {
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
      findOpt.raw.where.backtest = signal.backtest;
      findOpt.raw.where.mocktime = signal.mocktime;
    }
    return <types.Model.Signal | null>await db.model.Signal.find(findOpt);
  }

  async set(signal: types.Model.Signal) {
    // 写入数据库
    return await db.model.Signal.upsert(signal);
  }

  async remove(id: string) {
    return await db.model.Signal.destroy({
      where: { id }
    });
  }
}

/**
  * @class
  * @classdesc 资产管理器
  */
export class AssetManager {

  async get(accountId: string): Promise<types.Model.Account | null> {
    const account = <types.Model.Account | null>await db.model.Account.findById(accountId, {
      raw: true
    });
    if (account) {
      const positions = await db.model.Position.findAll({
        raw: true,
        where: {
          account_id: accountId
        }
      });
      if (positions) {
        account.positions = <Position[]>positions;
      }
    }
    return account;
  }
}

/**
  * @class
  * @classdesc 交易管理器
  */
export class TraderManager {

  async set(account: types.Model.Account, order: types.LimitOrder) {
    const orderData: { [Attr: string]: any } = {
      account_id: account.id,
      symbol: order.symbol,
      side: order.side,
      price: order.price,
      quantity: order.amount,
      backtest: order.backtest,
      mocktime: order.mocktime
    };

    // 保存交易记录
    await db.model.Transaction.upsert(orderData);
    // 买入操作
    if (order.side === types.OrderSide.Buy) {
      // 开仓
      await db.model.Position.upsert(orderData);
      // 更新账户资产
      await db.model.Account.upsert({
        id: account.id,
        // 余额 = 当前余额 - (股价*股数+500手续费)
        balance: <number>account.balance - (order.price * order.amount + 500)
      });
    } else if (order.side === types.OrderSide.Sell) {
      orderData.side = types.OrderSide.Buy;
      delete orderData.price;
      delete orderData.mocktime;
      // 查询是否有持仓
      if (account.positions) {
        const position = account.positions.find((posi) => {
          return posi.symbol === String(order.symbol) && posi.side === types.OrderSide.Buy;
        });
        if (position) {
          // 清仓
          await db.model.Position.destroy({
            where: {
              id: <number>position.id
            }
          });
        }
      }

      // 更新账户资产
      await db.model.Account.upsert({
        id: account.id,
        // 余额 = 当前余额 + (股价*股数-500手续费)
        balance: <number>account.balance + (order.price * order.amount - 500)
      });
    }
  }

  async remove(id: string) {
    return await db.model.Signal.destroy({
      where: { id }
    });
  }
}

/**
  * @class
  * @classdesc 持仓管理器
  */
export class PositionManager {

  async get(position: types.Model.Position): Promise<types.Model.Position | null> {
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
    return <types.Model.Position | null>await db.model.Position.find(findOpt);
  }

  async set(position: types.Model.Position) {
    // 写入数据库
    return await db.model.Position.upsert(position);
  }

  async remove(id: string) {
    return await db.model.Position.destroy({
      where: { id }
    });
  }
}

/**
  * @class
  * @classdesc 综合管理器
  */
export class Manager {
  signal: SignalManager;
  asset: AssetManager;
  trader: TraderManager;
  position: PositionManager;
  constructor() {
    db.init(require('config').store);
    this.signal = new SignalManager();
    this.asset = new AssetManager();
    this.trader = new TraderManager();
    this.position = new PositionManager();
  }
  destroy() {
    db.close();
  }
}
