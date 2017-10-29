import { Store as db } from 'ns-store';
import { Signal } from 'ns-types';

/**
  * @class
  * @classdesc 信号管理器
  */
export class SignalManager {

  async get(signalOpt: Signal): Promise<any> {
    const findOpt = <{ [Attr: string]: any }>{
      raw: true,
      where: {
        symbol: signalOpt.symbol
      }
    };
    if (signalOpt.side) {
      findOpt.where.side = signalOpt.side;
    }
    return await db.model.Signal.find(findOpt);
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
