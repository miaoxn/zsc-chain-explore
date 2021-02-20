import {
  IService,
  KnexHelper,
  QueryManyFn,
  QueryOneFn,
} from '@muta-extra/hermit-purple';
import { BALANCE, TRANSFER } from './db-mysql/constants';
import { Balance, Transfer } from './generated/types';
import { AssetModelService } from './services';

interface ITransferService {
  findByTxHash: QueryOneFn<Transfer, string>;
  filterByBlockHeight: QueryManyFn<Transfer, { blockHeight: number }>;
  filterByAssetId: QueryManyFn<Transfer, { assetId: string }>;
  filterByFromOrTo: QueryManyFn<Transfer, { fromOrTo: string }>;
  filter: QueryManyFn<Transfer, {}>;
}

interface IBalanceService {
  filterByAddress: QueryManyFn<Balance, { address: string }>;
}

export interface IHuobiService {
  transferService: ITransferService;
  balanceService: IBalanceService;
  assetService: AssetModelService;
}

export class HuobiService implements IHuobiService {
  transferService: ITransferService;
  balanceService: IBalanceService;
  assetService: AssetModelService;

  constructor() {
    const helper = new KnexHelper();
    const knex = helper.getKnexInstance();

    this.transferService = {
      async filter(args) {
        return helper.findMany<Transfer>(TRANSFER, {
          page: args.pageArgs,
          orderBy: ['id', 'desc'],
        });
      },
      async findByTxHash(txHash: string) {
        return helper.findOne<Transfer>(TRANSFER, { txHash });
      },

      async filterByBlockHeight(args) {
        return helper.findMany<Transfer>(TRANSFER, {
          page: args.pageArgs,
          where: { blockHeight: args.blockHeight },
          orderBy: ['id', 'desc'],
        });
      },

      async filterByAssetId(args) {
        return helper.findMany<Transfer>(TRANSFER, {
          page: args.pageArgs,
          where: { assetId: args.assetId },
          orderBy: ['id', 'desc'],
        });
      },

      async filterByFromOrTo(args) {
        const { fromOrTo, pageArgs } = args;
        const fromBuilder = helper.buildManyQuery<Transfer>(TRANSFER, {
          orderBy: ['id', 'desc'],
          where: { from: fromOrTo },
          page: pageArgs,
        });

        const toBuilder = helper.buildManyQuery<Transfer>(TRANSFER, {
          orderBy: ['id', 'desc'],
          where: { to: fromOrTo },
          page: pageArgs,
        });

        const { first, last, skip } = pageArgs || {};
        const limit = first || last || 10;
        const offset = skip || 0;

        const data = await knex.raw(
          `select * from (
(${fromBuilder.toQuery()}) 
union all 
(${toBuilder.toQuery()})) as t order by t.id desc limit ${limit} offset ${offset}`,
        );
        return data[0] ?? [];
      },
    };
    this.balanceService = {
      filterByAddress(args) {
        return helper.findMany<Balance>(BALANCE, {
          where: { address: args.address },
          orderBy: ['id', 'desc'],
          page: args.pageArgs,
        });
      },
    };
    this.assetService = new AssetModelService();
  }
}

export type IAllService = IHuobiService & IService;
