drop table if exists users;
CREATE TABLE `users` (
	`github_id` int NOT NULL,
	`username` varchar(255),
	PRIMARY KEY (`github_id`)
);

drop table if exists game_results;
CREATE TABLE `game_results` (
	`gamenum` int NOT NULL,
	`answers` varchar(30) NOT NULL,
	`user_id` int NOT NULL,
	`attempts` int NOT NULL,
	PRIMARY KEY (`gamenum`, `user_id`)
);