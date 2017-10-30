import { Store as db } from 'ns-store';
import { Signal, LimitOrder, OrderSide } from 'ns-types';

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

  async get(signalOpt: Signal): Promise<{ [Attr: string]: any }> {
    const findOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signalOpt.symbol
      }
    };
    if (signalOpt.side) {
      findOpt.where.side = signalOpt.side;
    }
    return <{ [Attr: string]: any }>await db.model.Signal.find(findOpt);
  }

  async set(signalOpt: { [Attr: string]: any }) {
    // 写入数据库
    return await db.model.Signal.upsert(signalOpt);
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
  * @classdesc 管理器
  */
export class Manager {
  signal: SignalManager;
  asset: AssetManager;
  trader: TraderManager;
  constructor() {
    db.init(require('config').store);
    this.signal = new SignalManager();
    this.asset = new AssetManager();
    this.trader = new TraderManager();
  }
  destroy() {
    db.close();
  }
}
