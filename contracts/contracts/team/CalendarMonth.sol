// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CalendarMonth
 * @notice The UTC calendar month of a timestamp, as yyyymm (October 2026 is
 *         202610). Issuance caps count per calendar month so the chain and the
 *         app's statements (src/lib/team/ledger.ts, UTC months) agree.
 * @dev    Days-to-civil-date conversion after Howard Hinnant's algorithm,
 *         restricted to timestamps on or after 1970-01-01.
 */
library CalendarMonth {
    function yyyymm(uint256 timestamp) internal pure returns (uint256) {
        uint256 z = timestamp / 86_400 + 719_468;
        uint256 era = z / 146_097;
        uint256 doe = z - era * 146_097;
        uint256 yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 month = mp < 10 ? mp + 3 : mp - 9;
        uint256 year = yoe + era * 400 + (month <= 2 ? 1 : 0);
        return year * 100 + month;
    }
}
