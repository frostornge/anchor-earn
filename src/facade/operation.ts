import {
  Coin,
  Coins,
  LCDClient,
  Msg,
  MsgSend,
  Numeric,
  StdFee,
  StdTx,
  Wallet,
} from '@terra-money/terra.js';
import { Fabricator, OmitAddress } from '../fabricators';
import { AddressProvider } from '../address-provider';
import {
  BlockTxBroadcastResult,
  SyncTxBroadcastResult,
} from '@terra-money/terra.js/dist/client/lcd/api/TxAPI';
import { Parse } from '../utils';
import accAddress = Parse.accAddress;

export interface OperationGasParameters {
  fee?: StdFee;
  gasPrices?: Coins.Input;
  gasAdjustment?: Numeric.Input;
}

export interface Operation {
  generateWithAddress(address: string): Msg[];
  generateWithWallet(wallet: Wallet): Msg[];
  creatTx(
    wallet: Wallet,
    gasParameters: OperationGasParameters,
  ): Promise<StdTx>;
  execute(
    wallet: Wallet,
    gasParameters: OperationGasParameters,
  ): Promise<SyncTxBroadcastResult>;
}

export class OperationImpl<FabricatorInputType> implements Operation {
  private _fabricator!: Fabricator<FabricatorInputType>;
  private _option!: OmitAddress<FabricatorInputType>;
  private _addressProvider!: AddressProvider;

  constructor(
    fabricator: Fabricator<FabricatorInputType>,
    option: OmitAddress<FabricatorInputType>,
    addressProvider: AddressProvider,
  ) {
    this._fabricator = fabricator;
    this._option = option;
    this._addressProvider = addressProvider;
  }

  generateWithAddress(address: string): Msg[] {
    return this._fabricator(({
      address,
      ...this._option,
    } as unknown) as FabricatorInputType)(this._addressProvider);
  }

  generateWithWallet(wallet: Wallet): Msg[] {
    return this.generateWithAddress(wallet.key.accAddress);
  }

  async creatTx(
    wallet: Wallet,
    { fee, gasPrices, gasAdjustment }: OperationGasParameters,
  ): Promise<StdTx> {
    return wallet.createAndSignTx({
      fee,
      gasAdjustment,
      gasPrices,
      msgs: this._fabricator(({
        address: wallet.key.accAddress,
        ...this._option,
      } as unknown) as FabricatorInputType)(this._addressProvider),
    });
  }

  async execute(
    wallet: Wallet,
    { fee, gasPrices, gasAdjustment }: OperationGasParameters,
  ): Promise<BlockTxBroadcastResult> {
    return wallet
      .createAndSignTx({
        fee,
        gasAdjustment,
        gasPrices,
        msgs: this._fabricator(({
          address: wallet.key.accAddress,
          ...this._option,
        } as unknown) as FabricatorInputType)(this._addressProvider),
      })
      .then((tx) => {
        return wallet.lcd.tx.broadcast(tx);
      });
  }
}

export async function sendSignedTransaction(
  lcd: LCDClient,
  tx: StdTx,
): Promise<SyncTxBroadcastResult> {
  return await lcd.tx.broadcastSync(tx);
}

export function createNativeSend(
  sender: string,
  options: { recipient: string; coin: Coin },
): MsgSend {
  return new MsgSend(sender, accAddress(options.recipient), [options.coin]);
}

export function createAndSignMsg(
  wallet: Wallet,
  { fee, gasPrices, gasAdjustment }: OperationGasParameters,
  msgs: Msg[],
): Promise<StdTx> {
  return wallet.createAndSignTx({
    fee,
    gasAdjustment,
    gasPrices,
    msgs: msgs,
  });
}
