import * as assert from 'power-assert';
import { OrderSide } from 'ns-types';
import { SignalManager } from './manager';

const signalManager = new SignalManager();

const testSetSignal = async (done: any) => {
  const res = await signalManager.setSignal({
    symbol: '6664',
    side: OrderSide.Buy,
    price: 2000,
    timeframe: '5min'
  })
  console.log(res);
  assert(res);
  done();
}

const testGetSignal = async (done: any) => {
  const signal = await signalManager.getSignal({
    symbol: '6664',
    side: OrderSide.Buy
  })
  console.log(signal);
  assert(signal.symbol === '6664')
  done();
}

const testRemoveSignal = async (done: any) => {
  const signal = await signalManager.getSignal({
    symbol: '6664',
    side: OrderSide.Buy
  })
  const res = await signalManager.removeSignal(signal.id);
  console.log(res);
  assert(res);
  signalManager.destroy();
  done();
}

describe('ns-manager', () => {
  it('存储信号', function (done) {
    this.timeout(20000);
    testSetSignal(done);
  });
  it('获取信号', function (done) {
    this.timeout(20000);
    testGetSignal(done);
  });
  it('删除信号', function (done) {
    this.timeout(20000);
    testRemoveSignal(done);
  });
});
