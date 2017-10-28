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
