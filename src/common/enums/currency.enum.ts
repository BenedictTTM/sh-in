/**
 * Currency types supported in the app economy
 */
export enum CurrencyType {
    ENERGY = 'energy',
    DIAMONDS = 'diamonds',
    GEMS = 'gems',
}

/**
 * Transaction types for currency movements
 */
export enum TransactionType {
    // Energy transactions
    ENERGY_REFILL_AUTO = 'energy_refill_auto',
    ENERGY_REFILL_DIAMOND = 'energy_refill_diamond',
    ENERGY_CONSUME = 'energy_consume',
    ENERGY_REWARD = 'energy_reward',

    // Diamond transactions
    DIAMOND_PURCHASE = 'diamond_purchase',
    DIAMOND_SPEND = 'diamond_spend',
    DIAMOND_REWARD = 'diamond_reward',
    DIAMOND_REFUND = 'diamond_refund',

    // Gem transactions
    GEM_EARN = 'gem_earn',
    GEM_SPEND = 'gem_spend',
    GEM_REWARD = 'gem_reward',
}

/**
 * Reasons for currency transactions
 */
export enum TransactionReason {
    // Energy reasons
    AUTO_REGENERATION = 'auto_regeneration',
    QUIZ_PLAY = 'quiz_play',
    DIAMOND_PURCHASE = 'diamond_purchase',
    ADMIN_GRANT = 'admin_grant',

    // Diamond reasons
    IAP_PURCHASE = 'iap_purchase',
    ENERGY_REFILL = 'energy_refill',
    BOOST_PURCHASE = 'boost_purchase',
    REWARD = 'reward',
    REFUND = 'refund',

    // Gem reasons
    QUIZ_COMPLETION = 'quiz_completion',
    ACHIEVEMENT = 'achievement',
    SHOP_PURCHASE = 'shop_purchase',
}
