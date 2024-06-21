-- drop table if exists users;
-- CREATE TABLE `users` (
-- 	`id` INTEGER primary key AUTOINCREMENT,
-- 	`github_id` int NOT NULL,
-- 	`username` varchar(255)
-- );

-- drop table if exists game_results;
-- CREATE TABLE `game_results` (
-- 	`gamenum` int NOT NULL,
-- 	`answers` varchar(30) NOT NULL,
-- 	`user_id` int NOT NULL,
-- 	`attempts` int NOT NULL,
-- 	PRIMARY KEY (`gamenum`, `user_id`)
-- );

drop table if exists identities;
CREATE TABLE `identities` (
	`persona_id` int not null,
	`provider` text not null,
	`provider_id` text not null,
	primary key (`persona_id`, `provider`)
);

drop table if exists personas;
create table `personas` (
	`id` INTEGER primary key AUTOINCREMENT,
	`username` text not null,
	`email` text
);