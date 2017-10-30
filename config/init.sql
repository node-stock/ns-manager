CREATE TABLE IF NOT EXISTS `Signal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) DEFAULT NULL,
  `timeframe` varchar(10) DEFAULT NULL,
  `side` char(4) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `notes` varchar(80) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='信号';

CREATE TABLE `Account` (
  `id` varchar(20) NOT NULL,
  `balance` bigint(20) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='账户';

CREATE TABLE `Position` (
  `id` int(20) NOT NULL AUTO_INCREMENT,
  `account_id` varchar(255) DEFAULT NULL,
  `symbol` varchar(20) DEFAULT NULL,
  `side` char(4) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `quantity` int(10) DEFAULT NULL,
  `pnl` int(20) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `position_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COMMENT='持仓';

CREATE TABLE `Transaction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` varchar(255) DEFAULT NULL,
  `order` varchar(20) DEFAULT NULL,
  `symbol` varchar(20) DEFAULT NULL,
  `side` char(4) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `quantity` int(10) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COMMENT='交易记录';
