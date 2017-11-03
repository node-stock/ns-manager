import { Store as db } from 'ns-store';
import { Model, LimitOrder, OrderSide } from 'ns-types';

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

  async get(signal: Model.Signal): Promise<Model.Signal | null> {
    const findOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signal.symbol
      }
    };
    if (signal.side) {
      findOpt.where.side = signal.side;
    }
    return <Model.Signal | null>await db.model.Signal.find(findOpt);
  }

  async set(signal: Model.Signal) {
    // 写入数据库
    return await db.model.Signal.upsert(signal);
  }

  async remove(id: string) {
    return await db.model.Signal.destroy({
      where: {
        id: id
      }
    });
  }
}

/**
  * @class
  * @classdesc 资产管理器
  */
export class AssetManager {

  async getBalance(accountId: string): Promise<number> {
    const res = <{ balance: number } | null>await db.model.Account.findById(accountId, {
      raw: true,
      attributes: ['balance']
    });
    return res ? res.balance : 0;
  }
}

/**
  * @class
  * @classdesc 交易管理器
  */
export class TraderManager {

  async set(account: { id: string, balance: number }, order: LimitOrder) {
    const orderData = {
      account_id: account.id,
      symbol: order.symbol,
      side: order.side,
      price: order.price,
      quantity: order.amount
    };

    // 保存交易记录
    await db.model.Transaction.upsert(orderData);

    // 买入操作
    if (order.side === OrderSide.Buy) {
      // 开仓
      await db.model.Position.upsert(orderData);
      // 更新账户资产
      await db.model.Account.upsert({
        id: account.id,
        // 余额 = 当前余额 - (股价*股数+500手续费)
        balance: account.balance - (order.price * order.amount + 500)
      });
    } else if (order.side === OrderSide.Sell) {
      orderData.side = OrderSide.Buy;
      delete orderData.price;
      // 清仓
      await db.model.Position.destroy({
        where: orderData
      });
      // 更新账户资产
      await db.model.Account.upsert({
        id: account.id,
        // 余额 = 当前余额 + (股价*股数-500手续费)
        balance: account.balance + (order.price * order.amount - 500)
      });
    }
  }

  async remove(id: string) {
    return await db.model.Signal.destroy({
      where: {
        id: id
      }
    });
  }
}

/**
  * @class
  * @classdesc 持仓管理器
  */
export class PositionManager {

  async get(position: Model.Position): Promise<Model.Position> {
    const findOpt = {
      raw: true,
      where: {
        symbol: position.symbol,
        account_id: position.account_id,
        side: position.side
      }
    };
    return <Model.Position>await db.model.Signal.find(findOpt);
  }

  async set(position: Model.Position) {
    // 写入数据库
    return await db.model.Signal.upsert(position);
  }

  async remove(id: string) {
    return await db.model.Signal.destroy({
      where: {
        id: id
      }
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
