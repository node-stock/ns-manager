import { Store as db } from 'ns-store';
import { Signal } from 'ns-types';

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

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

/**
  * @class
  * @classdesc 管理器
  */
export class Manager {
  signal: SignalManager;
  constructor() {
    db.init(require('config').store);
    this.signal = new SignalManager();
  }
  destroy() {
    db.close();
  }
}
