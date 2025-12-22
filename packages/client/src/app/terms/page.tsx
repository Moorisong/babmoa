import { Header } from '@/components';

export default function TermsPage() {
    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-5 py-12">
                <h1 className="text-2xl font-bold mb-6">이용약관</h1>
                <div className="prose prose-sm text-gray-700 space-y-6">
                    <section>
                        <h3 className="text-lg font-bold mb-2">목적</h3>
                        <p>
                            본 약관은 밥모아(이하 “회사”)가 제공하는 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">서비스의 제공</h3>
                        <p>회사는 다음과 같은 서비스를 제공합니다.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>회식 장소 검색 및 투표 기능</li>
                            <li>이용자 참여 기반 주차 정보 공유 및 통계 제공 기능</li>
                            <li>기타 회사가 정하는 부가 서비스</li>
                        </ul>
                        <p className="mt-2">
                            회사는 서비스의 내용을 추가, 변경 또는 중단할 수 있으며, 이 경우 사전에 공지하거나 서비스 내에서 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">서비스 이용의 성격</h3>
                        <p>
                            본 서비스에서 제공되는 모든 주차 관련 정보 및 통계는 이용자의 참여를 기반으로 수집된 참고용 정보입니다.
                        </p>
                        <p className="mt-2">
                            해당 정보는 실제 현장 상황, 시간대, 외부 요인 등에 따라 달라질 수 있으며, 회사는 정보의 정확성, 완전성, 최신성을 보장하지 않습니다.
                        </p>
                        <p className="mt-2">
                            이용자는 본 서비스를 참고 자료로만 활용해야 하며, 이를 근거로 한 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">이용자의 참여 및 데이터 활용</h3>
                        <p>
                            이용자가 서비스 내에서 입력하거나 제공한 투표 및 주차 관련 정보는 서비스 품질 개선, 통계 분석, 기능 고도화를 위해 활용될 수 있습니다.
                        </p>
                        <p className="mt-2">
                            이용자가 제공한 데이터는 개인을 식별할 수 없는 형태로 처리되며, 서비스 운영 목적 범위 내에서 사용됩니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">책임의 제한</h3>
                        <p>
                            회사는 서비스 이용과 관련하여 이용자에게 발생한 직접적 또는 간접적인 손해에 대해 법령상 허용되는 범위 내에서 책임을 지지 않습니다.
                        </p>
                        <p className="mt-2">
                            회사는 주차 가능 여부, 성공률, 확률 정보 등으로 인해 발생한 불이익, 비용, 손해에 대해 어떠한 책임도 부담하지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">서비스의 변경 및 중단</h3>
                        <p>
                            회사는 서비스의 전부 또는 일부를 사전 공지 후 변경하거나 중단할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            불가피한 사유가 있는 경우 사전 공지 없이 서비스가 중단될 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">약관의 변경</h3>
                        <p>
                            회사는 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            약관이 변경되는 경우, 변경 사항은 서비스 내 공지사항을 통해 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">준거법 및 관할</h3>
                        <p>
                            본 약관은 대한민국 법령에 따라 해석 및 적용됩니다.
                        </p>
                        <p className="mt-2">
                            서비스 이용과 관련하여 회사와 이용자 간에 발생한 분쟁에 대해서는 대한민국 법원을 관할 법원으로 합니다.
                        </p>
                    </section>
                </div>
            </main>
        </>
    );
}
