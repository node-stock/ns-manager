import { Store as db, Position, Account } from 'ns-store';
import * as types from 'ns-types';
import { Log, Util } from 'ns-common';
import * as moment from 'moment';
import { Sequelize } from 'sequelize-typescript';
// process.env.NODE_ENV = 'development';

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
      await this.remove(String(dbSignal.id));
    }
    // 写入数据库
    return await db.model.Signal.upsert(signal);
  }

  static async remove(id: string) {
    return await db.model.Signal.destroy({
      where: { id }
    });
  }
}

/**
  * @class
  * @classdesc 资产管理器
  */
export class AccountManager {

  static async get(accountId: string): Promise<types.Model.Account | undefined> {
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
      if (positions && positions.length > 0) {
        account.positions = <Position[]>positions;
      }
    }
    return account;
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
}

/**
  * @class
  * @classdesc 交易管理器
  */
export class TransactionManager {

  static async set(accountId: string, order: types.LimitOrder) {
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
      account_id: accountId,
      quantity: order.amount
    });
    await db.model.Transaction.upsert(transaction);

    // 更新持仓
    const position: types.Model.Position = Object.assign({}, order, {
      account_id: accountId,
      quantity: order.amount
    });
    await PositionManager.set(position, account);

    Log.system.info('记录交易信息[终了]');
  }
}

/**
  * @class
  * @classdesc 持仓管理器
  */
export class PositionManager {

  static async get(position: types.Model.Position): Promise<types.Model.Position | null> {
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

  /**
   * 更新(新增)持仓
   *
   * @param position  待更新(新增)持仓
   * @param account 账户情报，当调用层已获得account时，此对象不为空
   */
  static async set(position: types.Model.Position, account?: types.Model.Account) {
    Log.system.info('更新(新增)持仓[启动]');
    if (!account) {
      Log.system.info(`未传入账户信息，通过持仓对象的账户ID：${position.account_id}查找`);
      account = await AccountManager.get(String(position.account_id));
      if (!account) {
        Log.system.error('账户信息为空，更新(新增)持仓[异常终了]');
        return;
      }
    }
    // 持仓查询
    let updPositions: types.Model.Position[] | undefined;
    if (account.positions) {
      updPositions = account.positions.filter((posi) => {
        return posi.account_id === position.account_id
          && posi.symbol === position.symbol;
      });
    }
    Log.system.info(`股票(${position.symbol})的持仓:${JSON.stringify(updPositions)}`);
    // 默认手续费
    const fee = Util.getFee(position.symbol);
    // 查询是否使用比特币余额交易
    const useBitcoin = Util.getTradeUnit(position.symbol).type === 'btc' ? true : false;
    // 待更新对象
    let updPosition: types.Model.Position | undefined;
    // 查到持仓
    if (updPositions && updPositions.length !== 0) {
      // 平多
      if (position.side === types.OrderSide.BuyClose) {
        updPosition = updPositions.find((posi) => {
          return posi.side === types.OrderSide.Buy;
        });
        if (!updPosition) {
          Log.system.error('平多出错，未找到多单持仓[异常终了]');
          return;
        }
        // 更新数量
        updPosition.quantity = Number(updPosition.quantity) - Number(position.quantity);
        // 平仓总价
        const closeTotal = Number(position.price) * Number(position.quantity);
        // 开仓总价
        const openTotal = Number(updPosition.price) * Number(position.quantity);
        // 收益 = 平仓总价 - 开仓总价 - 买卖手续费
        const profit = closeTotal - openTotal - fee * 2;
        // 更新账户资金 = 当前余额 + (股价*股数) - 买卖手续费
        if (useBitcoin) {
          account.bitcoin = Number(account.bitcoin) + closeTotal - fee * 2;
        } else {
          account.balance = Number(account.balance) + closeTotal - fee * 2;
        }

        const earning: types.Model.Earning = Object.assign({}, position, {
          profit,
          open: updPosition.price,
          close: position.price,
          fee: fee * 2
        });
        // 记录收益
        await db.model.Earning.upsert(earning);
      } else if (position.side === types.OrderSide.Buy) { // 多单
        updPosition = updPositions.find((posi) => {
          return posi.side === types.OrderSide.Buy;
        });

        if (updPosition) {
          updPosition = Object.assign(updPosition, {
            created_at: null,
            updated_at: null
          });
          // 更新数量
          updPosition.quantity = Number(updPosition.quantity) + Number(position.quantity);
        }
        // 更新账户资金 = 当前余额 - (股价*股数) - 手续费
        if (useBitcoin) {
          account.bitcoin = Number(account.bitcoin) -
            (Number(position.price) * Number(position.quantity)) - fee;
        } else {
          account.balance = Number(account.balance) -
            (Number(position.price) * Number(position.quantity)) - fee;
        }
      } else if (position.side === types.OrderSide.SellClose) { // 平空
        updPosition = updPositions.find((posi) => {
          return posi.side === types.OrderSide.Sell;
        });
        if (!updPosition) {
          Log.system.error('平空出错，未找到多单持仓[异常终了]');
          return;
        }
        // 更新数量
        updPosition.quantity = Number(updPosition.quantity) - Number(position.quantity);
        // 平仓总价
        const closeTotal = Number(position.price) * Number(position.quantity);
        // 开仓总价
        const openTotal = Number(updPosition.price) * Number(position.quantity);
        // 收益 = 平仓总价 - 开仓总价 - 买卖手续费
        const profit = closeTotal - openTotal - fee * 2;
        // 更新账户资金 = 当前余额 + (股价*股数) - 买卖手续费
        if (useBitcoin) {
          account.bitcoin = Number(account.bitcoin) + closeTotal - fee * 2;
        } else {
          account.balance = Number(account.balance) + closeTotal - fee * 2;
        }

        const earning: types.Model.Earning = Object.assign({}, position, {
          profit,
          open: updPosition.price,
          close: position.price,
          fee: fee * 2
        });
        // 记录收益
        await db.model.Earning.upsert(earning);
      } else if (position.side === types.OrderSide.Sell) { // 空单
        updPosition = updPositions.find((posi) => {
          return posi.side === types.OrderSide.Sell;
        });
        if (updPosition) {
          updPosition = Object.assign(updPosition, {
            created_at: null,
            updated_at: null
          });
          // 更新数量
          updPosition.quantity = Number(updPosition.quantity) + Number(position.quantity);
        }
        // 更新账户资金 = 当前余额 - (股价*股数) - 手续费
        if (useBitcoin) {
          account.bitcoin = Number(account.bitcoin) -
            (Number(position.price) * Number(position.quantity)) - fee;
        } else {
          account.balance = Number(account.balance) -
            (Number(position.price) * Number(position.quantity)) - fee;
        }
      }
      // 更新对象不为空 && 持仓数量为零
      if (updPosition && updPosition.quantity === 0) {
        Log.system.info('更新对象不为空 && 持仓数量为零, 执行删除操作');
        // 清仓
        await db.model.Position.destroy({
          where: {
            id: <number>updPosition.id
          }
        });
        // 更新账户资产
        await db.model.Account.upsert(account);
        Log.system.info('更新(新增)持仓[终了]');
        return;
      } else if (updPosition && updPosition.quantity !== 0) { // 更新对象不为空 && 持仓数有值（已变化）
        Log.system.info('更新对象不为空 && 持仓数有值（已变化）, 执行更新操作');
        await db.sequelize.query(`
          update position
          set quantity = ${updPosition.quantity},
              updated_at = '${moment().format('YYYY-MM-DD hh:mm:ss')}'
          where id = ${updPosition.id}`);
        // 更新账户资产
        await db.model.Account.upsert(account);
        Log.system.info('更新(新增)持仓[终了]');
        return;
      }
    } else {
      // 更新账户资金 = 当前余额 - (股价*股数) - 手续费
      if (useBitcoin) {
        account.bitcoin = Number(account.bitcoin) -
          (Number(position.price) * Number(position.quantity)) - fee;
      } else {
        account.balance = Number(account.balance) -
          (Number(position.price) * Number(position.quantity)) - fee;
      }
    }
    Log.system.info('更新对象为空, 执行新增操作');
    // 未查询到持仓，新增持仓
    await db.model.Position.upsert(position);
    // 更新账户资产
    await db.model.Account.upsert(account);

    Log.system.info('更新(新增)持仓[终了]');
  }

  static async remove(id: string) {
    return await db.model.Position.destroy({
      where: { id }
    });
  }
}
