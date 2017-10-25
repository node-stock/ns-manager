import { Store as db } from 'ns-store';

/**
  * @class
  * @classdesc 管理器
  */
export class Manager {
  constructor() {
    db.init(require('config').store);
  }
  destroy() {
    db.close();
  }
}

export interface Signal {
  symbol: string,
  side: string,
  price?: number,
  timeframe?: string
}
/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager extends Manager {

  constructor() {
    super();
  }

  async getSignal(signalOpt: Signal): Promise<any> {
    return await db.model.Signal.find({
      raw: true,
      where: {
        symbol: signalOpt.symbol,
        side: signalOpt.side
      }
    });
  }

  async setSignal(signalOpt: Signal) {
    // 写入数据库
    return await db.model.Signal.upsert(signalOpt);
  }

  async removeSignal(id: string) {
    return await db.model.Signal.destroy({
      where: {
        id: id
      }
    });
  }
}
